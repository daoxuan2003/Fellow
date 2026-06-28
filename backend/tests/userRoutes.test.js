const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const userRoutes = require('../routes/user');

const userId = '111111111111111111111111';

let server;
let baseUrl;
let originalFindById;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRoutes);

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

test.beforeEach(() => {
  User.findById = originalFindById;
});

function authHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

test('password change rejects weak new passwords before saving', async () => {
  const currentHash = await bcrypt.hash('correct-password', 10);
  let saveCalls = 0;
  const user = {
    _id: userId,
    password: currentHash,
    async save() {
      saveCalls += 1;
    }
  };
  User.findById = async () => user;

  const response = await fetch(`${baseUrl}/api/user/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      currentPassword: 'correct-password',
      newPassword: 'short'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /8 到 128/);
  assert.equal(user.password, currentHash);
  assert.equal(saveCalls, 0);
});

test('legacy profile update rejects account and password mutation fields', async () => {
  let findByIdCalls = 0;
  User.findById = async () => {
    findByIdCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/user/update`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      nickname: '新昵称',
      account: 'new-account',
      password: 'new-password'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /账号和密码/);
  assert.equal(findByIdCalls, 0);
});

test('legacy profile update still saves non-credential profile fields', async () => {
  let saveCalls = 0;
  const user = {
    _id: userId,
    nickname: '旧昵称',
    account: 'viewer',
    password: 'existing-hash',
    pairCode: 'ABC123',
    partnerId: null,
    avatar: '',
    async save() {
      saveCalls += 1;
    }
  };
  User.findById = async () => user;

  const response = await fetch(`${baseUrl}/api/user/update`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      nickname: '新昵称',
      gender: 'female',
      bio: '新的签名',
      partnerNote: 'TA'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.nickname, '新昵称');
  assert.equal(body.data.account, 'viewer');
  assert.equal(user.password, 'existing-hash');
  assert.equal(saveCalls, 1);
});
