const test = require('node:test');
const assert = require('node:assert/strict');

const { User } = require('../models');
const {
  RelationshipStateError,
  commitCoupleUnbound,
  commitInviteAccepted,
  commitInviteSent
} = require('../utils/relationshipMutations');

let originalBulkWrite;

test.beforeEach(() => {
  originalBulkWrite = User.bulkWrite;
});

test.afterEach(() => {
  User.bulkWrite = originalBulkWrite;
});

test('invite send updates both users with conditional relationship guards', async () => {
  const now = new Date('2026-06-29T08:00:00.000Z');
  const sender = { _id: '111111111111111111111111', inviteStatus: 'idle', partnerId: null };
  const receiver = { _id: '222222222222222222222222', inviteStatus: 'idle', partnerId: null };
  let operations;

  User.bulkWrite = async (ops) => {
    operations = ops;
    return { matchedCount: 2 };
  };

  await commitInviteSent(sender, receiver, now);

  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0].updateOne.filter, {
    _id: sender._id,
    inviteStatus: 'idle',
    partnerId: { $in: [null, ''] }
  });
  assert.deepEqual(operations[1].updateOne.filter, {
    _id: receiver._id,
    inviteStatus: 'idle',
    partnerId: { $in: [null, ''] }
  });
  assert.equal(sender.invitingTo, receiver._id);
  assert.equal(receiver.invitingTo, sender._id);
});

test('invite accept binds both users only when the pending invitation still matches', async () => {
  const now = new Date('2026-06-29T08:30:00.000Z');
  const anniversary = new Date('2026-06-01T00:00:00.000Z');
  const receiver = {
    _id: '222222222222222222222222',
    inviteStatus: 'invited',
    invitingTo: '111111111111111111111111',
    partnerId: null
  };
  const sender = {
    _id: '111111111111111111111111',
    inviteStatus: 'inviting',
    invitingTo: '222222222222222222222222',
    partnerId: null
  };
  let operations;

  User.bulkWrite = async (ops) => {
    operations = ops;
    return { matchedCount: 2 };
  };

  await commitInviteAccepted(receiver, sender, anniversary, now);

  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0].updateOne.filter, {
    _id: receiver._id,
    inviteStatus: 'invited',
    invitingTo: sender._id,
    partnerId: { $in: [null, ''] }
  });
  assert.deepEqual(operations[1].updateOne.filter, {
    _id: sender._id,
    inviteStatus: 'inviting',
    invitingTo: receiver._id,
    partnerId: { $in: [null, ''] }
  });
  assert.equal(receiver.partnerId, sender._id);
  assert.equal(sender.partnerId, receiver._id);
  assert.equal(receiver.inviteStatus, 'bound');
  assert.equal(sender.inviteStatus, 'bound');
});

test('stale relationship writes fail without partially accepting the action', async () => {
  const receiver = {
    _id: '222222222222222222222222',
    inviteStatus: 'invited',
    invitingTo: '111111111111111111111111',
    partnerId: null
  };
  const sender = {
    _id: '111111111111111111111111',
    inviteStatus: 'inviting',
    invitingTo: '222222222222222222222222',
    partnerId: null
  };

  User.bulkWrite = async () => ({ matchedCount: 1 });

  await assert.rejects(
    () => commitInviteAccepted(receiver, sender, new Date(), new Date()),
    RelationshipStateError
  );
});

test('unbind clears the partner only when the relationship is reciprocal', async () => {
  const self = { _id: '111111111111111111111111', partnerId: '222222222222222222222222' };
  const partner = { _id: '222222222222222222222222', partnerId: '333333333333333333333333' };
  let operations;

  User.bulkWrite = async (ops) => {
    operations = ops;
    return { matchedCount: 1 };
  };

  await commitCoupleUnbound(self, partner, new Date('2026-06-29T09:00:00.000Z'));

  assert.equal(operations.length, 1);
  assert.equal(operations[0].updateOne.filter._id, self._id);
  assert.equal(self.partnerId, null);
  assert.equal(partner.partnerId, '333333333333333333333333');
});
