const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const authRoutes = require('../routes/auth');
const coupleRoutes = require('../routes/couple');

const viewerId = '111111111111111111111111';
const invitedUserId = '222222222222222222222222';
const unrelatedUserId = '333333333333333333333333';

let server;
let baseUrl;
let originalFindById;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', authRoutes);
  app.use('/api', coupleRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  originalFindById = User.findById;
});

test.after(async () => {
  User.findById = originalFindById;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

function authHeaders() {
  const token = jwt.sign({ userId: viewerId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}` };
}

function mockProfileLookup() {
  const viewer = {
    _id: viewerId,
    partnerId: null,
    invitingTo: invitedUserId,
    inviteStatus: 'inviting'
  };
  const invitedUser = {
    _id: invitedUserId,
    nickname: '被邀请人',
    avatar: '',
    bio: '你好',
    gender: 'female',
    account: 'must-not-leak',
    pairCode: 'SECRET'
  };

  User.findById = (id) => ({
    select: async () => id.toString() === viewerId ? viewer : invitedUser
  });
}

test('limited profile rejects unauthenticated requests', async () => {
  const response = await fetch(`${baseUrl}/api/user/${invitedUserId}`);
  assert.equal(response.status, 401);
});

test('authentication rejects tokens signed with an unexpected algorithm', async () => {
  const token = jwt.sign({ userId: viewerId }, JWT_SECRET, {
    algorithm: 'HS384',
    expiresIn: '5m'
  });
  const response = await fetch(`${baseUrl}/api/user/${invitedUserId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 401);
});

test('limited profile rejects unrelated users', async () => {
  mockProfileLookup();
  const response = await fetch(`${baseUrl}/api/user/${unrelatedUserId}`, {
    headers: authHeaders()
  });
  assert.equal(response.status, 403);
});

test('limited profile returns only invitation-safe fields', async () => {
  mockProfileLookup();
  const response = await fetch(`${baseUrl}/api/user/${invitedUserId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.nickname, '被邀请人');
  assert.equal(body.data.bio, '你好');
  assert.equal('account' in body.data, false);
  assert.equal('pairCode' in body.data, false);
  assert.equal('partnerId' in body.data, false);
});

test('legacy direct binding requires the consent-based invitation flow', async () => {
  const response = await fetch(`${baseUrl}/api/bind`, {
    method: 'POST',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 410);
  assert.match(body.message, /邀请/);
});

test('login rejects repeated invalid attempts with rate limiting', async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(response.status, 400);
  }

  const blockedResponse = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(blockedResponse.status, 429);
});

test('current user profile does not expose pair code in general profile response', async () => {
  User.findById = async (id) => ({
    _id: id,
    nickname: '小赴',
    account: 'viewer',
    pairCode: 'SECRET',
    partnerId: null,
    avatar: '',
    bio: '',
    gender: null,
    birthday: null,
    anniversary: null,
    partnerNote: '',
    inviteStatus: 'idle',
    createdAt: new Date('2026-06-29T00:00:00.000Z')
  });

  const response = await fetch(`${baseUrl}/api/me`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal('pairCode' in body.data, false);
});
