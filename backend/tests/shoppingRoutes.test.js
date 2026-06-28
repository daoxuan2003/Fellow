const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, ShoppingItem } = require('../models');
const shoppingRoutes = require('../routes/shopping');

const userId = '111111111111111111111111';
const currentPartnerId = '222222222222222222222222';
const itemId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const currentCoupleId = [userId, currentPartnerId].sort().join('_');

let server;
let baseUrl;
let broadcastToCouple;
let originalUserFindById;
let originalItemFindOne;
let originalItemDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (...args) => broadcastToCouple(...args);
  app.use('/api/shopping', shoppingRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalItemFindOne = ShoppingItem.findOne;
  originalItemDeleteOne = ShoppingItem.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  ShoppingItem.findOne = originalItemFindOne;
  ShoppingItem.deleteOne = originalItemDeleteOne;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  broadcastToCouple = () => {};
  User.findById = originalUserFindById;
  ShoppingItem.findOne = originalItemFindOne;
  ShoppingItem.deleteOne = originalItemDeleteOne;
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

function mockCurrentUser() {
  User.findById = async () => ({
    _id: userId,
    partnerId: currentPartnerId,
    nickname: '小赴'
  });
}

test('shopping item edit is scoped to the current couple relationship', async () => {
  mockCurrentUser();
  let itemQuery;

  ShoppingItem.findOne = async (query) => {
    itemQuery = query;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '新名称' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.match(body.message, /购物项不存在/);
  assert.deepEqual(itemQuery, { _id: itemId, coupleId: currentCoupleId });
});

test('shopping item delete writes the database before broadcasting sync', async () => {
  mockCurrentUser();
  const events = [];
  let deleteQuery;

  ShoppingItem.findOne = async (query) => {
    assert.deepEqual(query, { _id: itemId, coupleId: currentCoupleId });
    return {
      _id: itemId,
      createdBy: userId,
      coupleId: currentCoupleId,
      name: '牛奶',
      listName: '超市',
      listOwnership: 'both'
    };
  };
  ShoppingItem.deleteOne = async (query) => {
    deleteQuery = query;
    events.push('delete');
    return { deletedCount: 1 };
  };
  broadcastToCouple = (coupleId, message) => {
    events.push('broadcast');
    assert.equal(coupleId, currentCoupleId);
    assert.equal(message.type, 'shoppingSync');
    assert.equal(message.data.action, 'delete');
    assert.equal(message.data.payload.id, itemId);
    assert.equal(message.data.requestId, 'req-1');
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'req-1' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(deleteQuery, { _id: itemId, coupleId: currentCoupleId, createdBy: userId });
  assert.deepEqual(events, ['delete', 'broadcast']);
});
