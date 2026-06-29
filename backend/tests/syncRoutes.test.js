const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const syncRoutes = require('../routes/sync');

const userId = '111111111111111111111111';

let server;
let baseUrl;
let originalUserFindById;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sync', syncRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  originalUserFindById = User.findById;
});

test.after(async () => {
  User.findById = originalUserFindById;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  User.findById = originalUserFindById;
});

function authHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}` };
}

test('sync response does not include pair code in general user data', async () => {
  User.findById = async (id) => ({
    _id: id,
    nickname: '小赴',
    account: 'viewer',
    pairCode: 'SECRET',
    partnerId: null,
    avatar: '',
    gender: null,
    bio: '',
    partnerNote: '',
    boundAt: null,
    lastUpdate: new Date('2026-06-29T00:00:00.000Z')
  });

  const response = await fetch(`${baseUrl}/api/sync`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal('pairCode' in body.data, false);
});
