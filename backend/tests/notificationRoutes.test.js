const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');

const notificationRoutes = require('../routes/notifications');
const { User } = require('../models');

let server;
let baseUrl;
let originalUserFindById;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationRoutes);

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

test('test push endpoint is hidden in production before authentication', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  let lookupCalls = 0;
  User.findById = async () => {
    lookupCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '接口不存在');
  assert.equal(lookupCalls, 0);
});
