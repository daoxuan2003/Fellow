const express = require('express');
const mongoose = require('mongoose');

const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const walletRoutes = require('./wallet');
const { logError } = require('../utils/safeLogger');

const router = express.Router();
const ALLOWED_TYPES = new Set(['expense', 'income', 'transfer']);
const ALLOWED_REQUEST_KINDS = new Set(['expense', 'income', 'debt_purchase', 'asset_transfer']);

class WalletTransactionError extends Error {
  constructor(message, statusCode = 400, code = 'INVALID_WALLET_TRANSACTION') {
    super(message);
    this.name = 'WalletTransactionError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getCoupleId(userId, partnerId) {
  return [String(userId), String(partnerId)].sort().join('_');
}

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function serializeTransaction(transaction) {
  const row = plain(transaction);
  return {
    _id: row._id,
    type: row.type,
    kind: row.kind || (row.type === 'transfer' ? 'asset_transfer' : row.type),
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    accountId: row.accountId,
    toAccountId: row.toAccountId,
    date: row.date,
    note: row.note,
    creatorId: row.creatorId,
    createdAt: row.createdAt
  };
}

function serializeAccount(account) {
  const row = plain(account);
  return {
    _id: row._id,
    userId: row.userId,
    name: row.name,
    type: row.type,
    subType: row.subType,
    currency: row.currency,
    balance: row.balance,
    icon: row.icon,
    color: row.color,
    isArchived: row.isArchived
  };
}

function sessionOptions(session, extra = {}) {
  return session ? { ...extra, session } : extra;
}

function emitSync(app, coupleId, type, action, payload, actor, requestId = null) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple) return;
  broadcastToCouple(coupleId, {
    type,
    data: { action, payload, actor, requestId, timestamp: Date.now() }
  });
}

function respondError(res, error, label) {
  if (error instanceof WalletTransactionError || error instanceof walletRoutes.WalletMutationError) {
    return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
  }
  logError(label, error);
  return res.status(500).json({ success: false, message: '服务器错误' });
}

async function requireCouple(req) {
  const user = await User.findById(req.userId);
  if (!user?.partnerId) throw new WalletTransactionError('请先绑定伴侣', 400, 'PARTNER_REQUIRED');
  return { coupleId: getCoupleId(req.userId, user.partnerId) };
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WalletTransactionError('金额必须大于 0');
  }
  return Number(amount.toFixed(2));
}

function normalizeDate(value) {
  const raw = String(value || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00+08:00`)
    : new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new WalletTransactionError('请选择正确的发生日期');
  return date;
}

function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeId(value) {
  return value ? String(value) : null;
}

function normalizeRequestId(value) {
  const requestId = String(value || '').trim();
  if (requestId.length > 80) {
    throw new WalletTransactionError('提交标识无效，请重新打开表单', 400, 'INVALID_REQUEST_ID');
  }
  return requestId || `wallet-transaction-${new mongoose.Types.ObjectId()}`;
}

async function findAccount(accountId, query, session) {
  if (!accountId || !mongoose.isValidObjectId(accountId)) return null;
  return Account.findOne({ _id: accountId, ...query }, null, sessionOptions(session));
}

async function validateAndResolveAccounts({ type, accountId, toAccountId, coupleId, userId, session }) {
  if (!ALLOWED_TYPES.has(type)) throw new WalletTransactionError('流水类型不正确');

  if (type === 'transfer') {
    if (!accountId || !toAccountId) throw new WalletTransactionError('请选择转出和转入账户');
    if (String(accountId) === String(toAccountId)) throw new WalletTransactionError('不能转入同一账户');
    const [fromAccount, toAccount] = await Promise.all([
      findAccount(accountId, { coupleId, userId, type: 'asset', isArchived: false }, session),
      findAccount(toAccountId, { coupleId, userId, type: 'asset', isArchived: false }, session)
    ]);
    if (!fromAccount || !toAccount) throw new WalletTransactionError('请选择自己的有效资产账户');
    return { account: fromAccount, toAccount };
  }

  if (!accountId) return { account: null, toAccount: null };
  const account = await findAccount(accountId, { coupleId, userId, isArchived: false }, session);
  if (!account) throw new WalletTransactionError('请选择自己的有效账户');
  if (account.type === 'liability' && type !== 'expense') {
    throw new WalletTransactionError('负债账户只能记录负债消费；还款请从欠款计划发起');
  }
  return { account, toAccount: null };
}

function deriveKind(type, account) {
  if (type === 'transfer') return 'asset_transfer';
  if (type === 'expense' && account?.type === 'liability') return 'debt_purchase';
  return type;
}

function validateRequestedKind(requestedKind, derivedKind) {
  if (requestedKind === undefined || requestedKind === null || requestedKind === '') return;
  if (requestedKind === 'debt_payment') {
    throw new WalletTransactionError('请从欠款计划发起还款');
  }
  if (!ALLOWED_REQUEST_KINDS.has(requestedKind) || requestedKind !== derivedKind) {
    throw new WalletTransactionError('流水用途与账户类型不一致');
  }
}

function balanceDelta(transaction) {
  const amount = Number(transaction.amount);
  if (transaction.kind === 'debt_purchase') return amount;
  return transaction.type === 'income' ? amount : -amount;
}

async function adjustAccount(account, delta, session) {
  if (!account) return null;
  account.balance = Number((Number(account.balance || 0) + Number(delta)).toFixed(2));
  account.updatedAt = new Date();
  await account.save(sessionOptions(session));
  return account;
}

async function reversePreviousBalances(previous, coupleId, session, touched) {
  const accountId = normalizeId(previous.accountId);
  const toAccountId = normalizeId(previous.toAccountId);
  if (previous.type === 'transfer') {
    const fromAccount = await findAccount(accountId, { coupleId }, session);
    const toAccount = await findAccount(toAccountId, { coupleId }, session);
    const reversedFrom = await adjustAccount(fromAccount, Number(previous.amount), session);
    const reversedTo = await adjustAccount(toAccount, -Number(previous.amount), session);
    if (reversedFrom) touched.set(String(reversedFrom._id), reversedFrom);
    if (reversedTo) touched.set(String(reversedTo._id), reversedTo);
    return;
  }
  const account = await findAccount(accountId, { coupleId }, session);
  const adjusted = await adjustAccount(account, -balanceDelta(previous), session);
  if (adjusted) touched.set(String(adjusted._id), adjusted);
}

async function applyNextBalances(transaction, resolved, session, touched) {
  if (transaction.type === 'transfer') {
    const fromAccount = await adjustAccount(resolved.account, -Number(transaction.amount), session);
    const toAccount = await adjustAccount(resolved.toAccount, Number(transaction.amount), session);
    if (fromAccount) touched.set(String(fromAccount._id), fromAccount);
    if (toAccount) touched.set(String(toAccount._id), toAccount);
    return;
  }
  const account = await adjustAccount(resolved.account, balanceDelta(transaction), session);
  if (account) touched.set(String(account._id), account);
}

function buildTransactionInput(req, coupleId) {
  const type = String(req.body.type || '');
  const amount = normalizeAmount(req.body.amount);
  const accountId = normalizeId(req.body.accountId);
  const toAccountId = type === 'transfer' ? normalizeId(req.body.toAccountId) : null;
  const category = normalizeText(req.body.category, 20);
  if (type !== 'transfer' && !category) throw new WalletTransactionError('请选择分类');
  return {
    coupleId,
    userId: String(req.userId),
    type,
    amount,
    accountId,
    toAccountId,
    category: type === 'transfer' ? '' : category,
    currency: normalizeText(req.body.currency || 'CNY', 10).toUpperCase(),
    date: normalizeDate(req.body.date),
    note: normalizeText(req.body.note, 200),
    requestedKind: req.body.kind,
    requestId: normalizeRequestId(req.body.requestId)
  };
}

async function prepareTransaction(input, session = null) {
  const resolved = await validateAndResolveAccounts({
    type: input.type,
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    coupleId: input.coupleId,
    userId: input.userId,
    session
  });
  const kind = deriveKind(input.type, resolved.account);
  validateRequestedKind(input.requestedKind, kind);
  return { resolved, kind };
}

function newTransaction(input, kind, mutationStatus) {
  return new Transaction({
    coupleId: input.coupleId,
    type: input.type,
    kind,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    date: input.date,
    note: input.note,
    creatorId: input.userId,
    requestId: input.requestId,
    mutationStatus
  });
}

function assertTransactionReplay(transaction, input) {
  const row = plain(transaction);
  const sameRequest = String(row.creatorId) === input.userId
    && row.type === input.type
    && Number(row.amount) === input.amount
    && String(row.currency || 'CNY') === input.currency
    && String(row.category || '') === input.category
    && normalizeId(row.accountId) === input.accountId
    && normalizeId(row.toAccountId) === input.toAccountId
    && new Date(row.date).getTime() === input.date.getTime()
    && String(row.note || '') === input.note;
  if (!sameRequest) {
    throw new WalletTransactionError(
      '这次提交已用于另一条流水，请重新打开表单',
      409,
      'REQUEST_ID_CONFLICT'
    );
  }
}

async function findTransactionCreation(input, session = null) {
  return Transaction.findOne(
    { coupleId: input.coupleId, requestId: input.requestId },
    null,
    sessionOptions(session)
  );
}

async function createTransactionWithSession(input, session) {
  const replay = await findTransactionCreation(input, session);
  if (replay) {
    assertTransactionReplay(replay, input);
    if (replay.mutationStatus === 'pending') {
      throw new WalletTransactionError(
        '这条流水需要继续完成，请重试',
        409,
        'TRANSACTION_RECOVERY_REQUIRED'
      );
    }
    return { replay: true, transaction: replay, touched: [] };
  }

  const prepared = await prepareTransaction(input, session);
  const transaction = newTransaction(input, prepared.kind, 'ready');
  await transaction.save(sessionOptions(session));
  const touched = new Map();
  await applyNextBalances(transaction, prepared.resolved, session, touched);
  return { replay: false, transaction, touched: [...touched.values()] };
}

function includeAccountMutationFields(query) {
  return typeof query?.select === 'function'
    ? query.select('+walletMutationRequestId +walletMutationPreviousBalance +walletMutationPreviousUpdatedAt')
    : query;
}

async function findAccountMutationState(input, accountId) {
  return includeAccountMutationFields(Account.findOne({
    _id: accountId,
    coupleId: input.coupleId,
    userId: input.userId,
    isArchived: false
  }));
}

function inputFromStoredTransaction(transaction) {
  return {
    coupleId: String(transaction.coupleId),
    userId: String(transaction.creatorId),
    type: transaction.type,
    amount: Number(transaction.amount),
    accountId: normalizeId(transaction.accountId),
    toAccountId: normalizeId(transaction.toAccountId),
    category: String(transaction.category || ''),
    currency: String(transaction.currency || 'CNY'),
    date: new Date(transaction.date),
    note: String(transaction.note || ''),
    requestedKind: transaction.kind,
    requestId: String(transaction.requestId)
  };
}

async function recoverBlockingAccountMutation(current, input) {
  const blockingRequestId = String(current.walletMutationRequestId || '');
  if (!blockingRequestId || blockingRequestId === input.requestId) return current;
  const blockingTransaction = await Transaction.findOne({
    coupleId: input.coupleId,
    requestId: blockingRequestId
  });
  if (!blockingTransaction) {
    const previousBalance = Number(current.walletMutationPreviousBalance);
    const update = {
      $unset: {
        walletMutationRequestId: '',
        walletMutationPreviousBalance: '',
        walletMutationPreviousUpdatedAt: ''
      }
    };
    if (Number.isFinite(previousBalance)) {
      update.$set = {
        balance: previousBalance,
        updatedAt: current.walletMutationPreviousUpdatedAt || new Date()
      };
    }
    await Account.findOneAndUpdate(
      {
        _id: current._id,
        coupleId: input.coupleId,
        userId: input.userId,
        walletMutationRequestId: blockingRequestId
      },
      update,
      { new: true, runValidators: true }
    );
    return findAccountMutationState(input, current._id);
  }
  const blockingInput = inputFromStoredTransaction(blockingTransaction);
  if (blockingTransaction.mutationStatus === 'pending') {
    await createTransactionWithoutSession(blockingInput);
  }
  return findAccountMutationState(input, current._id);
}

async function applyAccountDeltaOnce(input, account, delta) {
  let current = await findAccountMutationState(input, account._id);
  if (!current) throw new WalletTransactionError('账户不存在或已归档', 409, 'ACCOUNT_NOT_FOUND');
  if (current.walletMutationRequestId === input.requestId) return current;
  let replaceableRequestId = null;
  if (current.walletMutationRequestId) {
    current = await recoverBlockingAccountMutation(current, input);
    if (current?.walletMutationRequestId === input.requestId) return current;
    if (current?.walletMutationRequestId) {
      const completed = await Transaction.findOne({
        coupleId: input.coupleId,
        requestId: current.walletMutationRequestId
      });
      if (completed && completed.mutationStatus !== 'pending') {
        replaceableRequestId = String(current.walletMutationRequestId);
      } else {
        throw new WalletTransactionError('这个账户正在处理另一条流水，请稍后重试', 409, 'ACCOUNT_BUSY');
      }
    }
  }

  const previousBalance = Number(current.balance || 0);
  const updateQuery = Account.findOneAndUpdate(
    {
      _id: current._id,
      coupleId: input.coupleId,
      userId: input.userId,
      isArchived: false,
      balance: previousBalance,
      $or: [
        { walletMutationRequestId: { $exists: false } },
        { walletMutationRequestId: null },
        ...(replaceableRequestId ? [{ walletMutationRequestId: replaceableRequestId }] : [])
      ]
    },
    {
      $inc: { balance: Number(delta) },
      $set: {
        walletMutationRequestId: input.requestId,
        walletMutationPreviousBalance: previousBalance,
        walletMutationPreviousUpdatedAt: current.updatedAt || new Date(),
        updatedAt: new Date()
      }
    },
    { new: true, runValidators: true }
  );
  const updated = await includeAccountMutationFields(updateQuery);
  if (updated) return updated;

  current = await findAccountMutationState(input, account._id);
  if (current?.walletMutationRequestId === input.requestId) return current;
  if (current?.walletMutationRequestId) {
    throw new WalletTransactionError('这个账户正在处理另一条流水，请稍后重试', 409, 'ACCOUNT_BUSY');
  }
  throw new WalletTransactionError('账户余额已变化，请刷新后重试', 409, 'STALE_ACCOUNT_BALANCE');
}

async function applyFallbackBalances(input, transaction, resolved, touched) {
  if (transaction.type === 'transfer') {
    const fromAccount = await applyAccountDeltaOnce(input, resolved.account, -Number(transaction.amount));
    touched.set(String(fromAccount._id), fromAccount);
    const toAccount = await applyAccountDeltaOnce(input, resolved.toAccount, Number(transaction.amount));
    touched.set(String(toAccount._id), toAccount);
    return;
  }
  if (!resolved.account) return;
  const account = await applyAccountDeltaOnce(input, resolved.account, balanceDelta(transaction));
  touched.set(String(account._id), account);
}

async function releaseAccountMutation(input, accountId) {
  const query = Account.findOneAndUpdate(
    {
      _id: accountId,
      coupleId: input.coupleId,
      userId: input.userId,
      walletMutationRequestId: input.requestId
    },
    {
      $unset: {
        walletMutationPreviousBalance: '',
        walletMutationPreviousUpdatedAt: ''
      }
    },
    { new: true, runValidators: true }
  );
  return includeAccountMutationFields(query);
}

async function releaseTransactionAccounts(input, transaction, touched = new Map()) {
  const accountIds = [normalizeId(transaction.accountId), normalizeId(transaction.toAccountId)].filter(Boolean);
  for (const accountId of [...new Set(accountIds)]) {
    try {
      const released = await releaseAccountMutation(input, accountId);
      if (released) touched.set(String(released._id), released);
    } catch (error) {
      logError('[Wallet] 清理流水账户恢复标记失败', error);
    }
  }
  return touched;
}

async function rollbackFallbackAccounts(input, touched) {
  for (const account of [...touched.values()].reverse()) {
    try {
      const current = await findAccountMutationState(input, account._id);
      if (!current || current.walletMutationRequestId !== input.requestId) continue;
      const previousBalance = Number(current.walletMutationPreviousBalance);
      if (!Number.isFinite(previousBalance)) continue;
      await Account.findOneAndUpdate(
        {
          _id: current._id,
          coupleId: input.coupleId,
          userId: input.userId,
          walletMutationRequestId: input.requestId
        },
        {
          $set: {
            balance: previousBalance,
            updatedAt: current.walletMutationPreviousUpdatedAt || new Date()
          },
          $unset: {
            walletMutationRequestId: '',
            walletMutationPreviousBalance: '',
            walletMutationPreviousUpdatedAt: ''
          }
        },
        { new: true, runValidators: true }
      );
    } catch (rollbackError) {
      logError('[Wallet] 流水账户余额补偿失败', rollbackError);
    }
  }
}

async function markTransactionReadyWithConfirmation(input, transaction) {
  try {
    const ready = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        coupleId: input.coupleId,
        requestId: input.requestId,
        mutationStatus: 'pending'
      },
      { $set: { mutationStatus: 'ready' } },
      { new: true, runValidators: true }
    );
    if (ready) return { transaction: ready, completedNow: true };
    const persisted = await findTransactionCreation(input);
    if (persisted && persisted.mutationStatus !== 'pending') {
      return { transaction: persisted, completedNow: false };
    }
    throw new WalletTransactionError('流水完成状态已变化，请刷新后重试', 409, 'STALE_TRANSACTION');
  } catch (error) {
    try {
      const persisted = await findTransactionCreation(input);
      if (persisted && persisted.mutationStatus !== 'pending') {
        return { transaction: persisted, completedNow: false };
      }
    } catch (confirmationError) {
      error.walletTransactionOutcomeUnknown = true;
      logError('[Wallet] 流水完成状态确认失败', confirmationError);
    }
    throw error;
  }
}

async function createTransactionWithoutSession(input) {
  let transaction = await findTransactionCreation(input);
  let replay = Boolean(transaction);
  if (transaction) {
    assertTransactionReplay(transaction, input);
    if (transaction.mutationStatus !== 'pending') {
      await releaseTransactionAccounts(input, transaction);
      return { replay: true, transaction, touched: [] };
    }
  } else {
    const prepared = await prepareTransaction(input);
    transaction = newTransaction(input, prepared.kind, 'pending');
    try {
      await transaction.save();
    } catch (error) {
      const persisted = await findTransactionCreation(input);
      if (!persisted) throw error;
      assertTransactionReplay(persisted, input);
      transaction = persisted;
      replay = true;
    }
  }

  const touched = new Map();
  try {
    const prepared = await prepareTransaction(input);
    await applyFallbackBalances(input, transaction, prepared.resolved, touched);
    const completion = await markTransactionReadyWithConfirmation(input, transaction);
    transaction = completion.transaction;
    await releaseTransactionAccounts(input, transaction, touched);
    return { replay, completedNow: completion.completedNow, transaction, touched: [...touched.values()] };
  } catch (error) {
    if (error.walletTransactionOutcomeUnknown) throw error;
    try {
      const persisted = await findTransactionCreation(input);
      if (persisted && persisted.mutationStatus !== 'pending') {
        await releaseTransactionAccounts(input, persisted, touched);
        return { replay, completedNow: false, transaction: persisted, touched: [...touched.values()] };
      }
    } catch (confirmationError) {
      error.walletTransactionOutcomeUnknown = true;
      logError('[Wallet] 流水失败状态确认失败', confirmationError);
      throw error;
    }
    let deletion;
    try {
      deletion = await Transaction.deleteOne({
        _id: transaction._id,
        coupleId: input.coupleId,
        requestId: input.requestId,
        mutationStatus: 'pending'
      });
    } catch (rollbackError) {
      logError('[Wallet] 清理未完成流水失败', rollbackError);
      error.walletTransactionOutcomeUnknown = true;
      throw error;
    }
    if (deletion.deletedCount !== 1) {
      const persisted = await findTransactionCreation(input);
      if (persisted && persisted.mutationStatus !== 'pending') {
        await releaseTransactionAccounts(input, persisted, touched);
        return { replay, completedNow: false, transaction: persisted, touched: [...touched.values()] };
      }
      error.walletTransactionOutcomeUnknown = true;
      throw error;
    }
    await rollbackFallbackAccounts(input, touched);
    throw error;
  }
}

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    const query = { coupleId, mutationStatus: { $ne: 'pending' } };
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = normalizeDate(req.query.startDate);
      if (req.query.endDate) query.date.$lt = normalizeDate(req.query.endDate);
    }
    if (req.query.type) {
      if (!ALLOWED_TYPES.has(req.query.type)) throw new WalletTransactionError('流水类型不正确');
      query.type = req.query.type;
    }
    const transactions = await Transaction.find(query).sort({ date: -1 }).limit(300).lean();
    return res.json({ success: true, data: transactions.map(serializeTransaction) });
  } catch (error) {
    return respondError(res, error, '[Wallet] 获取流水失败');
  }
});

router.post('/transactions', authMiddleware, async (req, res) => {
  let coupleId;
  let input;
  try {
    ({ coupleId } = await requireCouple(req));
    input = buildTransactionInput(req, coupleId);
    let result;
    try {
      result = await walletRoutes.withWalletTransaction(
        session => createTransactionWithSession(input, session)
      );
    } catch (error) {
      const recoveryRequired = error?.code === 'TRANSACTION_RECOVERY_REQUIRED';
      const topologyFallback = error?.code === 'TRANSACTION_UNAVAILABLE'
        && mongoose.connection?.readyState === 1;
      if (!recoveryRequired && !topologyFallback) throw error;
      result = await createTransactionWithoutSession(input);
    }

    const shouldBroadcast = result.completedNow !== false && (!result.replay || result.completedNow);
    if (shouldBroadcast) {
      for (const account of result.touched) {
        emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(account), req.userId, input.requestId);
      }
    }
    const payload = serializeTransaction(result.transaction);
    if (shouldBroadcast) {
      emitSync(req.app, coupleId, 'walletSync', 'transactionCreate', payload, req.userId, input.requestId);
    }
    return res.status(result.replay && !result.completedNow ? 200 : 201).json({
      success: true,
      replay: result.replay,
      data: payload
    });
  } catch (error) {
    if (error?.code === 11000 && input) {
      try {
        const replay = await findTransactionCreation(input);
        if (replay && replay.mutationStatus !== 'pending') {
          assertTransactionReplay(replay, input);
          return res.json({ success: true, replay: true, data: serializeTransaction(replay) });
        }
      } catch (replayError) {
        return respondError(res, replayError, '[Wallet] 确认重复流水失败');
      }
    }
    return respondError(res, error, '[Wallet] 创建流水失败');
  }
});

router.put('/transactions/:id', authMiddleware, async (req, res) => {
  let coupleId;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
    ({ coupleId } = await requireCouple(req));
    const result = await walletRoutes.withWalletTransaction(async (session) => {
      const transaction = await Transaction.findOne(
        { _id: req.params.id, coupleId }, null, sessionOptions(session)
      );
      if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
      if (String(transaction.creatorId) !== String(req.userId)) {
        throw new WalletTransactionError('只能修改自己创建的流水', 403, 'FORBIDDEN');
      }
      if (transaction.kind === 'debt_payment') {
        throw new WalletTransactionError('还款流水由欠款计划管理，不能单独修改', 409, 'SYSTEM_MANAGED');
      }

      const previous = { ...plain(transaction) };
      const type = req.body.type !== undefined ? String(req.body.type) : transaction.type;
      const amount = req.body.amount !== undefined ? normalizeAmount(req.body.amount) : Number(transaction.amount);
      const accountId = req.body.accountId !== undefined ? normalizeId(req.body.accountId) : normalizeId(transaction.accountId);
      const toAccountId = type === 'transfer'
        ? (req.body.toAccountId !== undefined ? normalizeId(req.body.toAccountId) : normalizeId(transaction.toAccountId))
        : null;
      const category = req.body.category !== undefined
        ? normalizeText(req.body.category, 20)
        : normalizeText(transaction.category, 20);
      if (type !== 'transfer' && !category) throw new WalletTransactionError('请选择分类');
      const validatedAccounts = await validateAndResolveAccounts({
        type, accountId, toAccountId, coupleId, userId: req.userId, session
      });
      const kind = deriveKind(type, validatedAccounts.account);
      validateRequestedKind(req.body.kind, kind);

      const touched = new Map();
      await reversePreviousBalances(previous, coupleId, session, touched);
      // Re-read after rollback so applying the replacement never saves a stale
      // pre-rollback balance when the old and new transaction use one account.
      const resolved = await validateAndResolveAccounts({
        type, accountId, toAccountId, coupleId, userId: req.userId, session
      });
      transaction.type = type;
      transaction.kind = kind;
      transaction.amount = amount;
      transaction.currency = req.body.currency !== undefined
        ? normalizeText(req.body.currency, 10).toUpperCase()
        : transaction.currency;
      transaction.category = type === 'transfer' ? '' : category;
      transaction.accountId = accountId;
      transaction.toAccountId = toAccountId;
      transaction.date = req.body.date !== undefined ? normalizeDate(req.body.date) : transaction.date;
      transaction.note = req.body.note !== undefined ? normalizeText(req.body.note, 200) : transaction.note;
      await transaction.save(sessionOptions(session));
      await applyNextBalances(transaction, resolved, session, touched);
      return { transaction, touched: [...touched.values()] };
    });

    for (const account of result.touched) {
      emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(account), req.userId);
    }
    const payload = serializeTransaction(result.transaction);
    emitSync(req.app, coupleId, 'walletSync', 'transactionUpdate', payload, req.userId);
    return res.json({ success: true, data: payload });
  } catch (error) {
    return respondError(res, error, '[Wallet] 更新流水失败');
  }
});

router.delete('/transactions/:id', authMiddleware, async (req, res) => {
  let coupleId;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
    ({ coupleId } = await requireCouple(req));
    const result = await walletRoutes.withWalletTransaction(async (session) => {
      const transaction = await Transaction.findOne(
        { _id: req.params.id, coupleId }, null, sessionOptions(session)
      );
      if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
      if (String(transaction.creatorId) !== String(req.userId)) {
        throw new WalletTransactionError('只能删除自己创建的流水', 403, 'FORBIDDEN');
      }
      if (transaction.kind === 'debt_payment') {
        throw new WalletTransactionError('还款流水由欠款计划管理，不能单独删除', 409, 'SYSTEM_MANAGED');
      }
      const previous = { ...plain(transaction) };
      const deletion = await Transaction.deleteOne(
        { _id: req.params.id, coupleId, creatorId: req.userId },
        sessionOptions(session)
      );
      if (deletion.deletedCount !== 1) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
      const touched = new Map();
      await reversePreviousBalances(previous, coupleId, session, touched);
      return { id: req.params.id, touched: [...touched.values()] };
    });

    for (const account of result.touched) {
      emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(account), req.userId);
    }
    emitSync(req.app, coupleId, 'walletSync', 'transactionDelete', { id: result.id }, req.userId);
    return res.json({ success: true });
  } catch (error) {
    return respondError(res, error, '[Wallet] 删除流水失败');
  }
});

module.exports = router;
module.exports.WalletTransactionError = WalletTransactionError;
module.exports.serializeTransaction = serializeTransaction;
