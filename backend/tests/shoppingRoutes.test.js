const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, ShoppingItem, ShoppingList } = require('../models');
const shoppingRoutes = require('../routes/shopping');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const itemId = '333333333333333333333333';
const listId = '444444444444444444444444';
const secondItemId = '555555555555555555555555';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let notifications;
let callOrder;
let originalUserFindById;
let originalItemFind;
let originalItemFindOne;
let originalItemFindOneAndUpdate;
let originalItemDeleteOne;
let originalItemDeleteMany;
let originalListFindOne;
let originalListDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.locals.sendNotification = (...args) => {
    callOrder.push('push');
    notifications.push(args);
  };
  app.use('/api/shopping', shoppingRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalItemFind = ShoppingItem.find;
  originalItemFindOne = ShoppingItem.findOne;
  originalItemFindOneAndUpdate = ShoppingItem.findOneAndUpdate;
  originalItemDeleteOne = ShoppingItem.deleteOne;
  originalItemDeleteMany = ShoppingItem.deleteMany;
  originalListFindOne = ShoppingList.findOne;
  originalListDeleteOne = ShoppingList.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  ShoppingItem.find = originalItemFind;
  ShoppingItem.findOne = originalItemFindOne;
  ShoppingItem.findOneAndUpdate = originalItemFindOneAndUpdate;
  ShoppingItem.deleteOne = originalItemDeleteOne;
  ShoppingItem.deleteMany = originalItemDeleteMany;
  ShoppingList.findOne = originalListFindOne;
  ShoppingList.deleteOne = originalListDeleteOne;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  notifications = [];
  callOrder = [];
  User.findById = async () => ({
    _id: userId,
    partnerId,
    nickname: '小赴'
  });
  ShoppingItem.findOne = async () => ({
    _id: itemId,
    createdBy: userId,
    coupleId,
    name: '牛奶',
    listName: '超市',
    listOwnership: 'both'
  });
  ShoppingItem.find = originalItemFind;
  ShoppingItem.findOneAndUpdate = originalItemFindOneAndUpdate;
  ShoppingItem.deleteOne = originalItemDeleteOne;
  ShoppingItem.deleteMany = originalItemDeleteMany;
  ShoppingList.findOne = originalListFindOne;
  ShoppingList.deleteOne = originalListDeleteOne;
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

function selectableItems(items) {
  return {
    select: async (fields) => {
      assert.equal(fields, '_id');
      return items;
    }
  };
}

test('shopping item complete scopes lookup and writes state with an atomic update', async () => {
  let findQuery;
  let updateQuery;
  let updatePayload;
  ShoppingItem.findOne = async (query) => {
    findQuery = query;
    return {
      _id: itemId,
      createdBy: partnerId,
      coupleId,
      name: '牛奶',
      status: 'pending',
      listName: '超市',
      listOwnership: 'both'
    };
  };
  ShoppingItem.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true });
    return {
      _id: itemId,
      createdBy: partnerId,
      coupleId,
      name: '牛奶',
      status: update.$set.status,
      completedBy: update.$set.completedBy,
      completedAt: update.$set.completedAt
    };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}/complete`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true, requestId: 'complete-request' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: itemId, coupleId });
  assert.deepEqual(updateQuery, { _id: itemId, coupleId });
  assert.equal(updatePayload.$set.status, 'completed');
  assert.equal(updatePayload.$set.completedBy, userId);
  assert.ok(updatePayload.$set.completedAt instanceof Date);
  assert.deepEqual(callOrder, ['update', 'broadcast', 'push']);
  assert.equal(events[0].message.data.action, 'complete');
  assert.equal(events[0].message.data.requestId, 'complete-request');
  assert.equal(notifications[0][0], partnerId);
});

test('shopping item complete does not emit sync when scoped update finds nothing', async () => {
  ShoppingItem.findOne = async () => ({
    _id: itemId,
    createdBy: partnerId,
    coupleId,
    name: '牛奶',
    status: 'pending'
  });
  ShoppingItem.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}/complete`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true, requestId: 'stale-complete' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item edit scopes lookup and update to the creator', async () => {
  let findQuery;
  let updateQuery;
  let updatePayload;
  ShoppingItem.findOne = async (query) => {
    findQuery = query;
    return {
      _id: itemId,
      createdBy: userId,
      coupleId,
      name: '牛奶',
      quantity: '1',
      note: '',
      image: null,
      listName: '超市',
      listOwnership: 'both',
      ownership: 'both',
      status: 'pending',
      createdAt: new Date('2026-07-01T00:00:00.000Z')
    };
  };
  ShoppingItem.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true });
    return {
      _id: itemId,
      createdBy: userId,
      coupleId,
      name: update.$set.name,
      quantity: update.$set.quantity,
      note: update.$set.note,
      image: update.$set.image,
      listName: update.$set.listName,
      listOwnership: update.$set.listOwnership,
      ownership: update.$set.ownership,
      status: 'pending',
      createdAt: new Date('2026-07-01T00:00:00.000Z')
    };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '  酸奶  ',
      quantity: ' 2盒 ',
      note: ' 冷藏 ',
      image: '',
      listName: '  便利店  ',
      listOwnership: 'self',
      createdBy: partnerId,
      requestId: 'edit-request'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: itemId, coupleId });
  assert.deepEqual(updateQuery, { _id: itemId, coupleId, createdBy: userId });
  assert.deepEqual(updatePayload, {
    $set: {
      name: '酸奶',
      quantity: '2盒',
      note: '冷藏',
      image: null,
      listName: '便利店',
      listOwnership: 'self',
      ownership: 'self'
    }
  });
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.createdBy, userId);
  assert.equal(events[0].message.data.requestId, 'edit-request');
});

test('shopping item delete emits sync and push only after database delete succeeds', async () => {
  let findQuery;
  ShoppingItem.findOne = async (query) => {
    findQuery = query;
    return {
      _id: itemId,
      createdBy: userId,
      coupleId,
      name: '牛奶',
      listName: '超市',
      listOwnership: 'both'
    };
  };
  ShoppingItem.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: itemId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'delete-request' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: itemId, coupleId });
  assert.deepEqual(callOrder, ['delete', 'broadcast', 'push']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'shoppingSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'delete-request');
  assert.equal(notifications.length, 1);
});

test('shopping item delete rejects partner-created item without deleting or notifying', async () => {
  let findQuery;
  let deleteCalls = 0;
  ShoppingItem.findOne = async (query) => {
    findQuery = query;
    return {
      _id: itemId,
      createdBy: partnerId,
      coupleId,
      name: '伴侣的牛奶',
      listName: '超市',
      listOwnership: 'both'
    };
  };
  ShoppingItem.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.deepEqual(findQuery, { _id: itemId, coupleId });
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item delete does not emit sync or push when database delete fails', async () => {
  ShoppingItem.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'failed-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping list delete emits sync only after creator-owned list is deleted', async () => {
  ShoppingList.findOne = async (query) => {
    assert.deepEqual(query, { _id: listId, coupleId });
    return {
      _id: listId,
      createdBy: userId,
      coupleId,
      name: '超市',
      ownership: 'both'
    };
  };
  ShoppingItem.find = (query) => {
    callOrder.push('find-items');
    assert.deepEqual(query, { coupleId, listName: '超市', listOwnership: 'both' });
    return selectableItems([{ _id: itemId }, { _id: secondItemId }]);
  };
  ShoppingItem.deleteMany = async (query) => {
    callOrder.push('delete-items');
    assert.deepEqual(query, { coupleId, listName: '超市', listOwnership: 'both' });
    return { deletedCount: 2 };
  };
  ShoppingList.deleteOne = async (query) => {
    callOrder.push('delete-list');
    assert.deepEqual(query, { _id: listId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/lists/${listId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'list-delete-request' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['find-items', 'delete-items', 'delete-list', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'shoppingSync');
  assert.equal(events[0].message.data.action, 'listDelete');
  assert.equal(events[0].message.data.requestId, 'list-delete-request');
  assert.deepEqual(events[0].message.data.payload.deletedItemIds, [itemId, secondItemId]);
  assert.equal(notifications.length, 0);
});

test('shopping list delete rejects partner-created list without deleting or broadcasting', async () => {
  let itemFindCalls = 0;
  let itemDeleteCalls = 0;
  let listDeleteCalls = 0;

  ShoppingList.findOne = async (query) => {
    assert.deepEqual(query, { _id: listId, coupleId });
    return {
      _id: listId,
      createdBy: partnerId,
      coupleId,
      name: '伴侣清单',
      ownership: 'both'
    };
  };
  ShoppingItem.find = () => {
    itemFindCalls += 1;
    return selectableItems([]);
  };
  ShoppingItem.deleteMany = async () => {
    itemDeleteCalls += 1;
    return { deletedCount: 1 };
  };
  ShoppingList.deleteOne = async () => {
    listDeleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/lists/${listId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(itemFindCalls, 0);
  assert.equal(itemDeleteCalls, 0);
  assert.equal(listDeleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('legacy shopping list delete rejects inferred partner-created list', async () => {
  let itemFindCalls = 0;
  let itemDeleteCalls = 0;
  let listDeleteCalls = 0;

  ShoppingList.findOne = async (query) => {
    assert.deepEqual(query, { coupleId, name: '超市', ownership: 'both' });
    return null;
  };
  ShoppingItem.findOne = async (query) => {
    assert.deepEqual(query, {
      coupleId,
      listName: '超市',
      listOwnership: 'both',
      createdBy: { $ne: userId }
    });
    return {
      _id: itemId,
      createdBy: partnerId,
      coupleId,
      name: '伴侣的牛奶',
      listName: '超市',
      listOwnership: 'both'
    };
  };
  ShoppingItem.find = () => {
    itemFindCalls += 1;
    return selectableItems([]);
  };
  ShoppingItem.deleteMany = async () => {
    itemDeleteCalls += 1;
    return { deletedCount: 1 };
  };
  ShoppingList.deleteOne = async () => {
    listDeleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/list/${encodeURIComponent('超市')}?ownership=both`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(itemFindCalls, 0);
  assert.equal(itemDeleteCalls, 0);
  assert.equal(listDeleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item delete does not emit sync or push when nothing is deleted', async () => {
  ShoppingItem.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'stale-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item delete does not read items outside the current relationship', async () => {
  let findQuery;
  let deleteCalls = 0;
  ShoppingItem.findOne = async (query) => {
    findQuery = query;
    return null;
  };
  ShoppingItem.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(findQuery, { _id: itemId, coupleId });
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});
