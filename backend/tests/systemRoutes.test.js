const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const systemRoutes = require('../routes/system');

const userId = '111111111111111111111111';

let server;
let baseUrl;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', systemRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

function authHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}` };
}

test('storage status requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/storage/status`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test('storage status exposes only public health fields', async () => {
  const response = await fetch(`${baseUrl}/api/storage/status`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(Object.keys(body.data).sort(), ['available', 'mode', 'status']);
  assert.equal(['local', 's3'].includes(body.data.mode), true);
  assert.equal(typeof body.data.available, 'boolean');
  assert.equal(['ready', 'unavailable'].includes(body.data.status), true);

  const serialized = JSON.stringify(body.data);
  assert.equal(serialized.includes('bucket'), false);
  assert.equal(serialized.includes('endpoint'), false);
  assert.equal(serialized.includes('region'), false);
  assert.equal(serialized.includes('AccessKey'), false);
  assert.equal(serialized.includes('SecretKey'), false);
});
