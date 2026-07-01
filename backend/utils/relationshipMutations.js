const mongoose = require('mongoose');
const { User } = require('../models');

class RelationshipStateError extends Error {
  constructor(message = '关系状态已变化，请刷新后重试', statusCode = 409) {
    super(message);
    this.name = 'RelationshipStateError';
    this.statusCode = statusCode;
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
      throw new RelationshipStateError('数据库不支持原子关系操作，请联系管理员', 503);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
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

  await withRelationshipTransaction((session) => runAtomicUserUpdates([
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
  ], session));

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

  await withRelationshipTransaction((session) => runAtomicUserUpdates([
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
  ], session));

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

  await withRelationshipTransaction((session) => runAtomicUserUpdates(operations, session));

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

  await withRelationshipTransaction((session) => runAtomicUserUpdates(operations, session));

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

  await withRelationshipTransaction((session) => runAtomicUserUpdates(operations, session));

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
