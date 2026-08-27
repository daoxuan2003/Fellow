const mongoose = require('mongoose');
const { User, RelationshipMutation } = require('../models');

class RelationshipStateError extends Error {
  constructor(message = '关系状态已变化，请刷新后重试', statusCode = 409, code = 'RELATIONSHIP_STATE_CHANGED') {
    super(message);
    this.name = 'RelationshipStateError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function toId(value) {
  return value?.toString();
}

function transactionUnavailable(error) {
  const message = String(error?.message || '');
  return message.includes('Transaction numbers are only allowed')
    || message.includes('Current topology does not support sessions')
    || message.includes('Sessions are not supported');
}

async function withRelationshipTransaction(operation) {
  if (typeof mongoose.startSession !== 'function' || mongoose.connection?.readyState !== 1) {
    if (process.env.NODE_ENV === 'production') {
      throw new RelationshipStateError('数据库暂时不可用，请稍后重试', 503, 'DATABASE_UNAVAILABLE');
    }
    return operation();
  }

  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
    return result;
  } catch (error) {
    if (transactionUnavailable(error)) {
      throw new RelationshipStateError('当前数据库需要使用关系恢复路径', 503, 'TRANSACTION_UNAVAILABLE');
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

function includeRelationshipMarker(query) {
  return typeof query?.select === 'function' ? query.select('+relationshipMutationId') : query;
}

function previousFields(subject, next) {
  return Object.fromEntries(Object.keys(next).map(key => [key, subject[key] ?? null]));
}

function buildRelationshipStates(operations, subjects) {
  return operations.map((operation, index) => ({
    userId: subjects[index]._id,
    filter: operation.updateOne.filter,
    previous: previousFields(subjects[index], operation.updateOne.update.$set || {}),
    next: operation.updateOne.update.$set || {}
  }));
}

async function findRelationshipMutation(requestId) {
  return RelationshipMutation.findOne({ requestId });
}

async function completeRelationshipMutation(mutation) {
  for (const state of mutation.states) {
    let user = await includeRelationshipMarker(User.findOne({ _id: state.userId }));
    if (!user) throw new RelationshipStateError('关系成员不存在，请刷新后重试', 409, 'RELATIONSHIP_USER_MISSING');
    if (String(user.relationshipMutationId || '') === mutation.requestId) continue;

    let replaceableMarker = null;
    if (user.relationshipMutationId) {
      const blocking = await findRelationshipMutation(String(user.relationshipMutationId));
      if (blocking?.status === 'pending') await completeRelationshipMutation(blocking);
      else if (blocking?.status === 'compensating') await compensateRelationshipMutation(blocking);
      user = await includeRelationshipMarker(User.findOne({ _id: state.userId }));
      if (String(user?.relationshipMutationId || '') === mutation.requestId) continue;
      if (user?.relationshipMutationId) {
        const completed = await findRelationshipMutation(String(user.relationshipMutationId));
        if (completed?.status !== 'ready') {
          throw new RelationshipStateError('关系正在处理另一项操作，请稍后重试', 409, 'RELATIONSHIP_BUSY');
        }
        replaceableMarker = String(user.relationshipMutationId);
      }
    }

    const query = {
      ...state.filter,
      $or: [
        { relationshipMutationId: { $exists: false } },
        { relationshipMutationId: null },
        ...(replaceableMarker ? [{ relationshipMutationId: replaceableMarker }] : [])
      ]
    };
    const updated = await includeRelationshipMarker(User.findOneAndUpdate(
      query,
      { $set: { ...state.next, relationshipMutationId: mutation.requestId } },
      { new: true, runValidators: true }
    ));
    if (!updated) {
      user = await includeRelationshipMarker(User.findOne({ _id: state.userId }));
      if (String(user?.relationshipMutationId || '') !== mutation.requestId) {
        throw new RelationshipStateError();
      }
    }
  }

  const ready = await RelationshipMutation.findOneAndUpdate(
    { _id: mutation._id, requestId: mutation.requestId, status: 'pending' },
    { $set: { status: 'ready', completedAt: new Date() } },
    { new: true, runValidators: true }
  );
  if (ready) return ready;
  const persisted = await findRelationshipMutation(mutation.requestId);
  if (persisted?.status === 'ready') return persisted;
  throw new RelationshipStateError('关系完成状态已变化，请稍后重试', 409, 'RELATIONSHIP_RECOVERY_BUSY');
}

async function compensateRelationshipMutation(mutation) {
  let claim = mutation;
  if (mutation.status === 'pending') {
    claim = await RelationshipMutation.findOneAndUpdate(
      { _id: mutation._id, requestId: mutation.requestId, status: 'pending' },
      { $set: { status: 'compensating' } },
      { new: true, runValidators: true }
    );
  }
  if (!claim) {
    const persisted = await findRelationshipMutation(mutation.requestId);
    if (persisted?.status === 'ready') return { completed: true, mutation: persisted };
    throw new RelationshipStateError('关系恢复状态已变化，请稍后重试', 409, 'RELATIONSHIP_RECOVERY_BUSY');
  }

  for (const state of [...claim.states].reverse()) {
    const user = await includeRelationshipMarker(User.findOne({ _id: state.userId }));
    if (!user || String(user.relationshipMutationId || '') !== claim.requestId) continue;
    const restored = await User.findOneAndUpdate(
      { _id: state.userId, relationshipMutationId: claim.requestId },
      { $set: state.previous, $unset: { relationshipMutationId: '' } },
      { new: true, runValidators: true }
    );
    if (!restored) {
      throw new RelationshipStateError('关系正在恢复，请稍后重试', 409, 'RELATIONSHIP_RECOVERY_BUSY');
    }
  }
  const deletion = await RelationshipMutation.deleteOne({
    _id: claim._id,
    requestId: claim.requestId,
    status: 'compensating'
  });
  if (deletion.deletedCount !== 1) {
    throw new RelationshipStateError('关系恢复结果无法确认，请稍后重试', 409, 'RELATIONSHIP_RECOVERY_BUSY');
  }
  return { completed: false };
}

async function runRelationshipWithoutTransaction({ action, actorId, operations, subjects }) {
  const mutation = new RelationshipMutation({
    requestId: `relationship-${new mongoose.Types.ObjectId()}`,
    action,
    actorId: String(actorId),
    status: 'pending',
    states: buildRelationshipStates(operations, subjects)
  });
  await mutation.save();
  try {
    await completeRelationshipMutation(mutation);
  } catch (error) {
    const persisted = await findRelationshipMutation(mutation.requestId);
    if (persisted?.status === 'ready') return;
    await compensateRelationshipMutation(persisted || mutation);
    throw error;
  }
}

async function executeRelationshipMutation({ action, actorId, operations, subjects }) {
  try {
    await withRelationshipTransaction(session => runAtomicUserUpdates(operations, session));
  } catch (error) {
    if (error?.code !== 'TRANSACTION_UNAVAILABLE' || mongoose.connection?.readyState !== 1) throw error;
    await runRelationshipWithoutTransaction({ action, actorId, operations, subjects });
  }
}

function getMatchedCount(result) {
  return result?.matchedCount
    ?? result?.result?.nMatched
    ?? result?.nMatched
    ?? 0;
}

async function runAtomicUserUpdates(operations, session) {
  const options = session ? { session } : undefined;
  const result = await User.bulkWrite(operations, options);

  if (getMatchedCount(result) !== operations.length) {
    throw new RelationshipStateError();
  }

  return result;
}

function userUpdate(filter, update) {
  return { updateOne: { filter, update } };
}

function copyFields(target, fields) {
  Object.assign(target, fields);
}

async function commitInviteSent(sender, receiver, now = new Date()) {
  const senderId = toId(sender._id);
  const receiverId = toId(receiver._id);
  const operations = [
    userUpdate(
      { _id: sender._id, inviteStatus: 'idle', partnerId: { $in: [null, ''] } },
      {
        $set: {
          inviteStatus: 'inviting',
          invitingTo: receiverId,
          inviteSentAt: now,
          lastUpdate: now
        }
      }
    ),
    userUpdate(
      { _id: receiver._id, inviteStatus: 'idle', partnerId: { $in: [null, ''] } },
      {
        $set: {
          inviteStatus: 'invited',
          invitingTo: senderId,
          inviteSentAt: now,
          lastUpdate: now
        }
      }
    )
  ];
  await executeRelationshipMutation({
    action: 'invite_send',
    actorId: senderId,
    operations,
    subjects: [sender, receiver]
  });

  copyFields(sender, {
    inviteStatus: 'inviting',
    invitingTo: receiverId,
    inviteSentAt: now,
    lastUpdate: now
  });
  copyFields(receiver, {
    inviteStatus: 'invited',
    invitingTo: senderId,
    inviteSentAt: now,
    lastUpdate: now
  });

  return now;
}

async function commitInviteAccepted(receiver, sender, sharedAnniversary, now = new Date()) {
  const receiverId = toId(receiver._id);
  const senderId = toId(sender._id);

  const operations = [
    userUpdate(
      {
        _id: receiver._id,
        inviteStatus: 'invited',
        invitingTo: senderId,
        partnerId: { $in: [null, ''] }
      },
      {
        $set: {
          inviteStatus: 'bound',
          partnerId: senderId,
          boundAt: now,
          anniversary: sharedAnniversary,
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    ),
    userUpdate(
      {
        _id: sender._id,
        inviteStatus: 'inviting',
        invitingTo: receiverId,
        partnerId: { $in: [null, ''] }
      },
      {
        $set: {
          inviteStatus: 'bound',
          partnerId: receiverId,
          boundAt: now,
          anniversary: sharedAnniversary,
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    )
  ];
  await executeRelationshipMutation({
    action: 'invite_accept',
    actorId: receiverId,
    operations,
    subjects: [receiver, sender]
  });

  copyFields(receiver, {
    inviteStatus: 'bound',
    partnerId: senderId,
    boundAt: now,
    anniversary: sharedAnniversary,
    invitingTo: null,
    inviteSentAt: null,
    lastUpdate: now
  });
  copyFields(sender, {
    inviteStatus: 'bound',
    partnerId: receiverId,
    boundAt: now,
    anniversary: sharedAnniversary,
    invitingTo: null,
    inviteSentAt: null,
    lastUpdate: now
  });

  return now;
}

async function commitInviteRejected(receiver, sender, now = new Date()) {
  const receiverId = toId(receiver._id);
  const senderId = toId(sender?._id);
  const shouldResetSender = Boolean(
    sender && sender.inviteStatus === 'inviting' && sender.invitingTo === receiverId
  );
  const operations = [
    userUpdate(
      { _id: receiver._id, inviteStatus: 'invited' },
      {
        $set: {
          inviteStatus: 'idle',
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    )
  ];

  if (shouldResetSender) {
    operations.push(userUpdate(
      { _id: sender._id, inviteStatus: 'inviting', invitingTo: receiverId },
      {
        $set: {
          inviteStatus: 'idle',
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    ));
  }

  await executeRelationshipMutation({
    action: 'invite_reject',
    actorId: receiverId,
    operations,
    subjects: shouldResetSender ? [receiver, sender] : [receiver]
  });

  copyFields(receiver, {
    inviteStatus: 'idle',
    invitingTo: null,
    inviteSentAt: null,
    lastUpdate: now
  });
  if (shouldResetSender && senderId) {
    copyFields(sender, {
      inviteStatus: 'idle',
      invitingTo: null,
      inviteSentAt: null,
      lastUpdate: now
    });
  }
}

async function commitInviteCancelled(sender, receiver, now = new Date()) {
  const senderId = toId(sender._id);
  const receiverId = toId(receiver?._id);
  const shouldResetReceiver = Boolean(
    receiver && receiver.inviteStatus === 'invited' && receiver.invitingTo === senderId
  );
  const operations = [
    userUpdate(
      { _id: sender._id, inviteStatus: 'inviting' },
      {
        $set: {
          inviteStatus: 'idle',
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    )
  ];

  if (shouldResetReceiver) {
    operations.push(userUpdate(
      { _id: receiver._id, inviteStatus: 'invited', invitingTo: senderId },
      {
        $set: {
          inviteStatus: 'idle',
          invitingTo: null,
          inviteSentAt: null,
          lastUpdate: now
        }
      }
    ));
  }

  await executeRelationshipMutation({
    action: 'invite_cancel',
    actorId: senderId,
    operations,
    subjects: shouldResetReceiver ? [sender, receiver] : [sender]
  });

  copyFields(sender, {
    inviteStatus: 'idle',
    invitingTo: null,
    inviteSentAt: null,
    lastUpdate: now
  });
  if (shouldResetReceiver && receiverId) {
    copyFields(receiver, {
      inviteStatus: 'idle',
      invitingTo: null,
      inviteSentAt: null,
      lastUpdate: now
    });
  }
}

async function commitCoupleUnbound(self, partner, now = new Date(), options = {}) {
  const clearAnniversary = options.clearAnniversary !== false;
  const selfId = toId(self._id);
  const partnerId = toId(self.partnerId);
  const resetFields = {
    partnerId: null,
    boundAt: null,
    inviteStatus: 'idle',
    invitingTo: null,
    inviteSentAt: null,
    lastUpdate: now
  };

  if (clearAnniversary) {
    resetFields.anniversary = null;
  }

  const operations = [
    userUpdate(
      { _id: self._id, partnerId },
      { $set: resetFields }
    )
  ];

  if (partner && toId(partner.partnerId) === selfId) {
    operations.push(userUpdate(
      { _id: partner._id, partnerId: selfId },
      { $set: resetFields }
    ));
  }

  await executeRelationshipMutation({
    action: 'unbind',
    actorId: selfId,
    operations,
    subjects: operations.length === 2 ? [self, partner] : [self]
  });

  copyFields(self, resetFields);
  if (partner && toId(partner.partnerId) === selfId) {
    copyFields(partner, resetFields);
  }
}

module.exports = {
  RelationshipStateError,
  commitCoupleUnbound,
  commitInviteAccepted,
  commitInviteCancelled,
  commitInviteRejected,
  commitInviteSent
};
