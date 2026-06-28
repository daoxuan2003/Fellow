function toId(value) {
  if (!value) return null;
  return value.toString();
}

function uniqueAccountIds(accountIds) {
  return [...new Set((accountIds || []).map(toId).filter(Boolean))];
}

function getTransactionAccountIds(type, accountId, toAccountId) {
  if (type === 'transfer') {
    return uniqueAccountIds([accountId, toAccountId]);
  }
  return uniqueAccountIds([accountId]);
}

async function loadCoupleAccountMap(AccountModel, accountIds, coupleId) {
  const ids = uniqueAccountIds(accountIds);
  if (ids.length === 0) {
    return { accountsById: new Map(), missingAccountIds: [] };
  }

  const accounts = await AccountModel.find({ _id: { $in: ids }, coupleId });
  const accountsById = new Map(accounts.map(account => [toId(account._id), account]));
  const missingAccountIds = ids.filter(id => !accountsById.has(id));

  return { accountsById, missingAccountIds };
}

function getAccountById(accountsById, accountId) {
  const id = toId(accountId);
  return id ? accountsById.get(id) : null;
}

module.exports = {
  getAccountById,
  getTransactionAccountIds,
  loadCoupleAccountMap,
  toId,
  uniqueAccountIds
};
