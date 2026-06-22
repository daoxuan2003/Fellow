const crypto = require('crypto');

const PAIR_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generatePairCode(length = 6) {
  return Array.from(
    { length },
    () => PAIR_CODE_ALPHABET[crypto.randomInt(PAIR_CODE_ALPHABET.length)]
  ).join('');
}

function canViewLimitedProfile(viewer, targetUserId) {
  if (!viewer || !targetUserId) return false;

  const activeInviteUserId = ['inviting', 'invited'].includes(viewer.inviteStatus)
    ? viewer.invitingTo
    : null;
  const allowedIds = [viewer._id, viewer.partnerId, activeInviteUserId]
    .filter(Boolean)
    .map((id) => id.toString());

  return allowedIds.includes(targetUserId.toString());
}

module.exports = {
  generatePairCode,
  canViewLimitedProfile
};
