const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { User, RelationshipMutation } = require('../models');
const {
  RelationshipStateError,
  commitCoupleUnbound,
  commitInviteAccepted,
  commitInviteSent
} = require('../utils/relationshipMutations');

let originalBulkWrite;
let originalUserFindOne;
let originalUserFindOneAndUpdate;
let originalMutationFindOne;
let originalMutationFindOneAndUpdate;
let originalMutationDeleteOne;
let originalMutationSave;
let originalStartSession;
let originalReadyStateDescriptor;

test.beforeEach(() => {
  originalBulkWrite = User.bulkWrite;
  originalUserFindOne = User.findOne;
  originalUserFindOneAndUpdate = User.findOneAndUpdate;
  originalMutationFindOne = RelationshipMutation.findOne;
  originalMutationFindOneAndUpdate = RelationshipMutation.findOneAndUpdate;
  originalMutationDeleteOne = RelationshipMutation.deleteOne;
  originalMutationSave = RelationshipMutation.prototype.save;
  originalStartSession = mongoose.startSession;
  originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
});

test.afterEach(() => {
  User.bulkWrite = originalBulkWrite;
  User.findOne = originalUserFindOne;
  User.findOneAndUpdate = originalUserFindOneAndUpdate;
  RelationshipMutation.findOne = originalMutationFindOne;
  RelationshipMutation.findOneAndUpdate = originalMutationFindOneAndUpdate;
  RelationshipMutation.deleteOne = originalMutationDeleteOne;
  RelationshipMutation.prototype.save = originalMutationSave;
  mongoose.startSession = originalStartSession;
  if (originalReadyStateDescriptor) {
    Object.defineProperty(mongoose.connection, 'readyState', originalReadyStateDescriptor);
  } else {
    delete mongoose.connection.readyState;
  }
});

function forceMongooseReadyState(readyState) {
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: readyState
  });
}

function installRelationshipFallbackStore(rows, { failUserId = null } = {}) {
  const users = new Map(rows.map(row => [String(row._id), { ...row }]));
  const mutations = new Map();
  let userWrites = 0;

  const matches = (row, query) => Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some(condition => matches(row, condition));
    }
    if (expected?.$in) return expected.$in.map(String).includes(String(row[key] ?? ''));
    if (expected?.$exists === false) return row[key] === undefined;
    if (expected === null) return row[key] === null || row[key] === undefined;
    return String(row[key] ?? '') === String(expected ?? '');
  });

  User.findOne = async query => users.get(String(query._id)) || null;
  User.findOneAndUpdate = async (query, update) => {
    const row = users.get(String(query._id));
    if (!row || !matches(row, query)) return null;
    if (failUserId && String(query._id) === String(failUserId)
      && update.$set?.relationshipMutationId) return null;
    userWrites += 1;
    if (update.$set) Object.assign(row, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete row[key];
    }
    return row;
  };

  RelationshipMutation.prototype.save = async function save() {
    mutations.set(String(this.requestId), this);
    return this;
  };
  RelationshipMutation.findOne = async query => mutations.get(String(query.requestId)) || null;
  RelationshipMutation.findOneAndUpdate = async (query, update) => {
    const mutation = mutations.get(String(query.requestId));
    if (!mutation || (query._id && String(query._id) !== String(mutation._id))
      || (query.status && query.status !== mutation.status)) return null;
    if (update.$set) Object.assign(mutation, update.$set);
    return mutation;
  };
  RelationshipMutation.deleteOne = async query => {
    const mutation = mutations.get(String(query.requestId));
    if (!mutation || (query.status && query.status !== mutation.status)) return { deletedCount: 0 };
    mutations.delete(String(query.requestId));
    return { deletedCount: 1 };
  };

  return { users, mutations, get userWrites() { return userWrites; } };
}

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

test('relationship mutations use a MongoDB transaction session when connected', async () => {
  const now = new Date('2026-06-29T08:45:00.000Z');
  const sender = { _id: '111111111111111111111111', inviteStatus: 'idle', partnerId: null };
  const receiver = { _id: '222222222222222222222222', inviteStatus: 'idle', partnerId: null };
  const session = {
    withTransaction: async (operation, options) => {
      assert.deepEqual(options, {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });
      await operation();
    },
    endSession: async () => {}
  };
  let bulkOptions;

  forceMongooseReadyState(1);
  mongoose.startSession = async () => session;
  User.bulkWrite = async (_ops, options) => {
    bulkOptions = options;
    return { matchedCount: 2 };
  };

  await commitInviteSent(sender, receiver, now);

  assert.deepEqual(bulkOptions, { session });
  assert.equal(sender.inviteStatus, 'inviting');
  assert.equal(receiver.inviteStatus, 'invited');
});

test('unsupported transactions use a durable fallback and update both relationship users', async () => {
  const sender = { _id: '111111111111111111111111', inviteStatus: 'idle', partnerId: null };
  const receiver = { _id: '222222222222222222222222', inviteStatus: 'idle', partnerId: null };
  const store = installRelationshipFallbackStore([sender, receiver]);
  const session = {
    withTransaction: async (operation) => {
      await operation();
    },
    endSession: async () => {}
  };

  forceMongooseReadyState(1);
  mongoose.startSession = async () => session;
  User.bulkWrite = async () => {
    throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
  };

  await commitInviteSent(sender, receiver, new Date('2026-06-29T09:00:00.000Z'));

  assert.equal(sender.inviteStatus, 'inviting');
  assert.equal(receiver.inviteStatus, 'invited');
  assert.equal(store.users.get(sender._id).inviteStatus, 'inviting');
  assert.equal(store.users.get(receiver._id).inviteStatus, 'invited');
  assert.equal(store.userWrites, 2);
  assert.equal(store.mutations.size, 1);
  assert.equal([...store.mutations.values()][0].status, 'ready');
});

test('a failed fallback relationship mutation compensates the first user and leaves inputs unchanged', async () => {
  const sender = { _id: '111111111111111111111111', inviteStatus: 'idle', partnerId: null };
  const receiver = { _id: '222222222222222222222222', inviteStatus: 'idle', partnerId: null };
  const store = installRelationshipFallbackStore([sender, receiver], { failUserId: receiver._id });
  let bulkCalls = 0;

  forceMongooseReadyState(1);
  mongoose.startSession = async () => {
    throw new Error('Sessions are not supported by this deployment');
  };
  User.bulkWrite = async () => {
    bulkCalls += 1;
    return { matchedCount: 2 };
  };

  await assert.rejects(
    () => commitInviteSent(sender, receiver, new Date()),
    (error) => {
      assert.equal(error instanceof RelationshipStateError, true);
      assert.equal(error.statusCode, 409);
      return true;
    }
  );
  assert.equal(bulkCalls, 0);
  assert.equal(sender.inviteStatus, 'idle');
  assert.equal(receiver.inviteStatus, 'idle');
  assert.equal(store.users.get(sender._id).inviteStatus, 'idle');
  assert.equal(store.users.get(receiver._id).inviteStatus, 'idle');
  assert.equal(store.users.get(sender._id).relationshipMutationId, undefined);
  assert.equal(store.mutations.size, 0);
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
