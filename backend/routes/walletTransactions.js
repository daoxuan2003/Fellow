const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');

const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { DebtPayment } = require('../models/Wallet');
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

function mutationHash(action, payload) {
  const fields = action === 'delete'
    ? [action]
    : [
        action,
        payload.type,
        Number(payload.amount),
        payload.currency,
        payload.category,
        normalizeId(payload.accountId),
        normalizeId(payload.toAccountId),
        new Date(payload.date).toISOString(),
        payload.note,
        payload.kind
      ];
  return crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex');
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

function includeTransactionMutationFields(query) {
  return typeof query?.select === 'function'
    ? query.select('+mutationAction +mutationRequestId +mutationHash +mutationPayload')
    : query;
}

async function findAccountMutationState(input, accountId) {
  return includeAccountMutationFields(Account.findOne({
    _id: accountId,
    coupleId: input.coupleId,
    userId: input.userId
  }));
}

async function findWalletOperation(coupleId, requestId) {
  const transaction = await includeTransactionMutationFields(Transaction.findOne({
    coupleId,
    $or: [{ requestId }, { mutationRequestId: requestId }]
  }));
  if (transaction) return { kind: 'transaction', record: transaction };
  const payment = await DebtPayment.findOne({ coupleId, requestId });
  return payment ? { kind: 'payment', record: payment } : null;
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
  const blockingOperation = await findWalletOperation(input.coupleId, blockingRequestId);
  if (!blockingOperation) {
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
  if (blockingOperation.kind === 'payment') {
    if (blockingOperation.record.mutationStatus === 'pending') {
      const error = new WalletTransactionError('这个账户正在继续一笔还款，请稍后重试', 409, 'ACCOUNT_BUSY');
      error.walletPaymentRecoveryRequired = true;
      throw error;
    }
    return findAccountMutationState(input, current._id);
  }
  const blockingTransaction = blockingOperation.record;
  if (blockingTransaction.mutationStatus === 'compensating') {
    throw new WalletTransactionError('这个账户正在恢复上一条流水，请稍后重试', 409, 'ACCOUNT_BUSY');
  }
  if (blockingTransaction.mutationRequestId === blockingRequestId
    && blockingTransaction.mutationAction
    && blockingTransaction.mutationStatus === 'pending') {
    await mutateTransactionWithoutSession(inputFromStoredTransactionMutation(blockingTransaction));
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
      const completed = await findWalletOperation(input.coupleId, current.walletMutationRequestId);
      const completedStatus = completed?.record?.mutationStatus || completed?.record?.status;
      if (completed && !['pending', 'compensating'].includes(completedStatus)) {
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
  const accountIds = [
    normalizeId(transaction.accountId),
    normalizeId(transaction.toAccountId),
    ...touched.keys()
  ].filter(Boolean);
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
  let complete = true;
  for (const account of [...touched.values()].reverse()) {
    try {
      const current = await findAccountMutationState(input, account._id);
      if (!current || current.walletMutationRequestId !== input.requestId) continue;
      const previousBalance = Number(current.walletMutationPreviousBalance);
      if (!Number.isFinite(previousBalance)) {
        complete = false;
        continue;
      }
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
      complete = false;
      logError('[Wallet] 流水账户余额补偿失败', rollbackError);
    }
  }
  return complete;
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

function transactionMutationFields(payload) {
  return {
    type: payload.type,
    kind: payload.kind,
    amount: payload.amount,
    currency: payload.currency,
    category: payload.category,
    accountId: payload.accountId,
    toAccountId: payload.toAccountId,
    date: payload.date,
    note: payload.note
  };
}

async function buildTransactionMutationInput(req, transaction, coupleId, action, session = null) {
  const requestId = normalizeRequestId(req.body?.requestId);
  if (action === 'delete') {
    return {
      transactionId: String(transaction._id),
      coupleId,
      userId: String(req.userId),
      action,
      requestId,
      hash: mutationHash(action, {}),
      payload: {}
    };
  }

  const type = req.body.type !== undefined ? String(req.body.type) : transaction.type;
  const payload = {
    type,
    amount: req.body.amount !== undefined ? normalizeAmount(req.body.amount) : Number(transaction.amount),
    accountId: req.body.accountId !== undefined ? normalizeId(req.body.accountId) : normalizeId(transaction.accountId),
    toAccountId: type === 'transfer'
      ? (req.body.toAccountId !== undefined ? normalizeId(req.body.toAccountId) : normalizeId(transaction.toAccountId))
      : null,
    category: type === 'transfer'
      ? ''
      : (req.body.category !== undefined
          ? normalizeText(req.body.category, 20)
          : normalizeText(transaction.category, 20)),
    currency: req.body.currency !== undefined
      ? normalizeText(req.body.currency, 10).toUpperCase()
      : String(transaction.currency || 'CNY'),
    date: req.body.date !== undefined ? normalizeDate(req.body.date) : new Date(transaction.date),
    note: req.body.note !== undefined ? normalizeText(req.body.note, 200) : String(transaction.note || '')
  };
  if (type !== 'transfer' && !payload.category) throw new WalletTransactionError('请选择分类');
  const prepared = await prepareTransaction({
    ...payload,
    coupleId,
    userId: String(req.userId),
    requestedKind: req.body.kind,
    requestId
  }, session);
  payload.kind = prepared.kind;
  return {
    transactionId: String(transaction._id),
    coupleId,
    userId: String(req.userId),
    action,
    requestId,
    hash: mutationHash(action, payload),
    payload,
    prepared
  };
}

function inputFromStoredTransactionMutation(transaction) {
  return {
    transactionId: String(transaction._id),
    coupleId: String(transaction.coupleId),
    userId: String(transaction.creatorId),
    action: transaction.mutationAction,
    requestId: String(transaction.mutationRequestId),
    hash: String(transaction.mutationHash),
    payload: plain(transaction.mutationPayload || {})
  };
}

function assertTransactionMutationReplay(transaction, input) {
  if (String(transaction.mutationRequestId || '') !== input.requestId
    || String(transaction.mutationAction || '') !== input.action
    || String(transaction.mutationHash || '') !== input.hash) {
    throw new WalletTransactionError(
      '这次提交已用于另一项流水操作，请重新打开表单',
      409,
      'REQUEST_ID_CONFLICT'
    );
  }
}

async function findTransactionForMutation(transactionId, coupleId, session = null) {
  return includeTransactionMutationFields(Transaction.findOne(
    { _id: transactionId, coupleId },
    null,
    sessionOptions(session)
  ));
}

async function findTransactionByMutationRequest(coupleId, requestId) {
  return includeTransactionMutationFields(Transaction.findOne({ coupleId, mutationRequestId: requestId }));
}

function addEffect(effects, accountId, delta) {
  if (!accountId) return;
  const id = String(accountId);
  const next = Number(((effects.get(id) || 0) + Number(delta)).toFixed(2));
  if (next === 0) effects.delete(id);
  else effects.set(id, next);
}

function transactionEffects(transaction) {
  const row = plain(transaction);
  const effects = new Map();
  if (row.type === 'transfer') {
    addEffect(effects, row.accountId, -Number(row.amount));
    addEffect(effects, row.toAccountId, Number(row.amount));
  } else if (row.accountId) {
    addEffect(effects, row.accountId, balanceDelta(row));
  }
  return effects;
}

function mutationBalanceDeltas(previous, next) {
  const deltas = new Map();
  for (const [accountId, delta] of transactionEffects(previous)) addEffect(deltas, accountId, -delta);
  if (next) {
    for (const [accountId, delta] of transactionEffects(next)) addEffect(deltas, accountId, delta);
  }
  return deltas;
}

async function prepareStoredMutation(input) {
  if (input.action === 'delete') return { prepared: null, payload: {} };
  const payload = {
    ...input.payload,
    accountId: normalizeId(input.payload.accountId),
    toAccountId: normalizeId(input.payload.toAccountId),
    date: new Date(input.payload.date)
  };
  const prepared = await prepareTransaction({
    ...payload,
    coupleId: input.coupleId,
    userId: input.userId,
    requestedKind: payload.kind,
    requestId: input.requestId
  });
  if (prepared.kind !== payload.kind || mutationHash(input.action, payload) !== input.hash) {
    throw new WalletTransactionError('待恢复流水内容无效，请重新操作', 409, 'INVALID_RECOVERY_STATE');
  }
  return { prepared, payload };
}

async function resolveMutationAccounts(input, previous, next, prepared) {
  const deltas = mutationBalanceDeltas(previous, next);
  const accounts = new Map();
  if (prepared?.resolved?.account) accounts.set(String(prepared.resolved.account._id), prepared.resolved.account);
  if (prepared?.resolved?.toAccount) accounts.set(String(prepared.resolved.toAccount._id), prepared.resolved.toAccount);
  for (const accountId of deltas.keys()) {
    if (accounts.has(accountId)) continue;
    const account = await findAccount(accountId, {
      coupleId: input.coupleId,
      userId: input.userId
    });
    if (!account) {
      throw new WalletTransactionError('原流水账户不存在或不属于创建者', 409, 'PREVIOUS_ACCOUNT_MISSING');
    }
    accounts.set(accountId, account);
  }
  return { deltas, accounts };
}

async function applyTransactionMutationBalances(input, deltas, accounts) {
  const touched = new Map(accounts);
  for (const [accountId, delta] of [...deltas.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const updated = await applyAccountDeltaOnce(input, accounts.get(accountId), delta);
    touched.set(accountId, updated);
  }
  return touched;
}

async function completeTransactionMutation(input, transaction) {
  const update = {
    $set: {
      mutationStatus: 'ready',
      mutationAction: input.action,
      mutationRequestId: input.requestId,
      mutationHash: input.hash
    },
    $unset: { mutationPayload: '' }
  };
  if (input.action === 'delete') {
    update.$set.isDeleted = true;
    update.$set.deletedAt = new Date();
  } else {
    Object.assign(update.$set, transactionMutationFields(input.payload));
    update.$set.isDeleted = false;
    update.$unset.deletedAt = '';
  }
  const query = Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      coupleId: input.coupleId,
      creatorId: input.userId,
      mutationStatus: 'pending',
      mutationAction: input.action,
      mutationRequestId: input.requestId,
      mutationHash: input.hash
    },
    update,
    { new: true, runValidators: true }
  );
  const completed = await includeTransactionMutationFields(query);
  if (completed) return { transaction: completed, completedNow: true };
  const persisted = await findTransactionForMutation(transaction._id, input.coupleId);
  if (persisted?.mutationStatus === 'ready') {
    assertTransactionMutationReplay(persisted, input);
    return { transaction: persisted, completedNow: false };
  }
  throw new WalletTransactionError('流水完成状态已变化，请刷新后重试', 409, 'STALE_TRANSACTION');
}

async function compensateTransactionMutation(input, transaction, touched) {
  let claim = transaction;
  if (transaction.mutationStatus === 'pending') {
    const claimQuery = Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        coupleId: input.coupleId,
        creatorId: input.userId,
        mutationStatus: 'pending',
        mutationRequestId: input.requestId,
        mutationHash: input.hash
      },
      { $set: { mutationStatus: 'compensating' } },
      { new: true, runValidators: true }
    );
    claim = await includeTransactionMutationFields(claimQuery);
  }
  if (!claim) {
    const persisted = await findTransactionForMutation(transaction._id, input.coupleId);
    if (persisted?.mutationStatus === 'ready') {
      assertTransactionMutationReplay(persisted, input);
      return { completed: true, transaction: persisted };
    }
    throw new WalletTransactionError('流水恢复状态已变化，请稍后重试', 409, 'MUTATION_RECOVERY_BUSY');
  }

  const rolledBack = await rollbackFallbackAccounts(input, touched);
  if (!rolledBack) {
    throw new WalletTransactionError('流水正在恢复账户余额，请稍后重试', 409, 'MUTATION_RECOVERY_BUSY');
  }
  const restoredQuery = Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      coupleId: input.coupleId,
      creatorId: input.userId,
      mutationStatus: 'compensating',
      mutationRequestId: input.requestId,
      mutationHash: input.hash
    },
    {
      $set: { mutationStatus: 'ready' },
      $unset: {
        mutationAction: '',
        mutationRequestId: '',
        mutationHash: '',
        mutationPayload: ''
      }
    },
    { new: true, runValidators: true }
  );
  const restored = await includeTransactionMutationFields(restoredQuery);
  if (!restored) throw new WalletTransactionError('流水恢复结果无法确认，请稍后重试', 409, 'MUTATION_RECOVERY_BUSY');
  return { completed: false, transaction: restored };
}

async function mutateTransactionWithoutSession(input) {
  let transaction = await findTransactionForMutation(input.transactionId, input.coupleId);
  if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
  if (String(transaction.creatorId) !== input.userId) {
    throw new WalletTransactionError('只能操作自己创建的流水', 403, 'FORBIDDEN');
  }
  if (transaction.kind === 'debt_payment') {
    throw new WalletTransactionError('还款流水由欠款计划管理，不能单独操作', 409, 'SYSTEM_MANAGED');
  }
  if (transaction.mutationStatus === 'ready'
    && String(transaction.mutationRequestId || '') === input.requestId) {
    assertTransactionMutationReplay(transaction, input);
    return { replay: true, completedNow: false, transaction, touched: [] };
  }
  if (transaction.isDeleted) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
  if (transaction.mutationStatus === 'compensating') {
    if (String(transaction.mutationRequestId || '') !== input.requestId) {
      throw new WalletTransactionError('这条流水正在恢复，请稍后重试', 409, 'MUTATION_RECOVERY_BUSY');
    }
    assertTransactionMutationReplay(transaction, input);
    input.payload = plain(transaction.mutationPayload || {});
    const stored = await prepareStoredMutation(input);
    input.payload = stored.payload;
    const resolved = await resolveMutationAccounts(
      input,
      transaction,
      input.action === 'update' ? input.payload : null,
      stored.prepared
    );
    await compensateTransactionMutation(input, transaction, new Map(resolved.accounts));
    throw new WalletTransactionError('上次操作已恢复，请再次提交', 409, 'MUTATION_RECOVERED');
  }

  let replay = transaction.mutationStatus === 'pending';
  if (replay) {
    assertTransactionMutationReplay(transaction, input);
    input.payload = plain(transaction.mutationPayload || {});
  } else {
    let claimed;
    try {
      const claimQuery = Transaction.findOneAndUpdate(
        {
          _id: transaction._id,
          coupleId: input.coupleId,
          creatorId: input.userId,
          isDeleted: { $ne: true },
          mutationStatus: { $nin: ['pending', 'compensating'] }
        },
        {
          $set: {
            mutationStatus: 'pending',
            mutationAction: input.action,
            mutationRequestId: input.requestId,
            mutationHash: input.hash,
            mutationPayload: input.payload
          }
        },
        { new: true, runValidators: true }
      );
      claimed = await includeTransactionMutationFields(claimQuery);
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const used = await findTransactionByMutationRequest(input.coupleId, input.requestId);
      if (used && String(used._id) !== input.transactionId) {
        throw new WalletTransactionError(
          '这次提交已用于另一条流水，请重新打开表单',
          409,
          'REQUEST_ID_CONFLICT'
        );
      }
      if (used) {
        assertTransactionMutationReplay(used, input);
        return mutateTransactionWithoutSession(inputFromStoredTransactionMutation(used));
      }
      throw error;
    }
    if (!claimed) {
      transaction = await findTransactionForMutation(input.transactionId, input.coupleId);
      if (transaction?.mutationStatus === 'ready'
        && String(transaction.mutationRequestId || '') === input.requestId) {
        assertTransactionMutationReplay(transaction, input);
        return { replay: true, completedNow: false, transaction, touched: [] };
      }
      if (transaction?.mutationStatus === 'pending'
        && String(transaction.mutationRequestId || '') === input.requestId) {
        assertTransactionMutationReplay(transaction, input);
        return mutateTransactionWithoutSession(inputFromStoredTransactionMutation(transaction));
      }
      throw new WalletTransactionError('这条流水正在处理另一项操作，请稍后重试', 409, 'TRANSACTION_BUSY');
    }
    transaction = claimed;
  }

  let touched = new Map();
  try {
    const stored = await prepareStoredMutation(input);
    input.payload = stored.payload;
    const resolved = await resolveMutationAccounts(
      input,
      transaction,
      input.action === 'update' ? input.payload : null,
      stored.prepared
    );
    touched = new Map(resolved.accounts);
    touched = await applyTransactionMutationBalances(input, resolved.deltas, resolved.accounts);
    const completion = await completeTransactionMutation(input, transaction);
    transaction = completion.transaction;
    await releaseTransactionAccounts(input, transaction, touched);
    return {
      replay,
      completedNow: completion.completedNow,
      transaction,
      touched: [...touched.values()]
    };
  } catch (error) {
    const persisted = await findTransactionForMutation(transaction._id, input.coupleId);
    if (persisted?.mutationStatus === 'ready'
      && String(persisted.mutationRequestId || '') === input.requestId) {
      assertTransactionMutationReplay(persisted, input);
      await releaseTransactionAccounts(input, persisted, touched);
      return { replay: true, completedNow: false, transaction: persisted, touched: [...touched.values()] };
    }
    const compensation = await compensateTransactionMutation(input, transaction, touched);
    if (compensation.completed) {
      return {
        replay: true,
        completedNow: false,
        transaction: compensation.transaction,
        touched: [...touched.values()]
      };
    }
    throw error;
  }
}

async function mutateTransactionWithSession(req, coupleId, action, session) {
  const transaction = await findTransactionForMutation(req.params.id, coupleId, session);
  if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
  if (String(transaction.creatorId) !== String(req.userId)) {
    throw new WalletTransactionError(action === 'delete' ? '只能删除自己创建的流水' : '只能修改自己创建的流水', 403, 'FORBIDDEN');
  }
  if (transaction.kind === 'debt_payment') {
    throw new WalletTransactionError(
      action === 'delete' ? '还款流水由欠款计划管理，不能单独删除' : '还款流水由欠款计划管理，不能单独修改',
      409,
      'SYSTEM_MANAGED'
    );
  }
  const input = await buildTransactionMutationInput(req, transaction, coupleId, action, session);
  if (transaction.mutationStatus === 'ready'
    && String(transaction.mutationRequestId || '') === input.requestId) {
    assertTransactionMutationReplay(transaction, input);
    return { replay: true, input, transaction, touched: [] };
  }
  if (transaction.mutationStatus === 'pending' || transaction.mutationStatus === 'compensating') {
    throw new WalletTransactionError('这条流水需要继续恢复，请重试', 409, 'TRANSACTION_RECOVERY_REQUIRED');
  }
  if (transaction.isDeleted) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');

  const next = action === 'update' ? input.payload : null;
  const resolved = await resolveMutationAccounts(input, transaction, next, input.prepared);
  const touched = new Map();
  for (const [accountId, delta] of [...resolved.deltas.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const account = await adjustAccount(resolved.accounts.get(accountId), delta, session);
    touched.set(accountId, account);
  }
  if (action === 'update') {
    Object.assign(transaction, transactionMutationFields(input.payload));
  } else {
    transaction.isDeleted = true;
    transaction.deletedAt = new Date();
  }
  transaction.mutationStatus = 'ready';
  transaction.mutationAction = input.action;
  transaction.mutationRequestId = input.requestId;
  transaction.mutationHash = input.hash;
  transaction.mutationPayload = undefined;
  await transaction.save(sessionOptions(session));
  return { replay: false, input, transaction, touched: [...touched.values()] };
}

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    const query = {
      coupleId,
      mutationStatus: { $nin: ['pending', 'compensating'] },
      isDeleted: { $ne: true }
    };
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
    let result;
    try {
      result = await walletRoutes.withWalletTransaction(
        session => mutateTransactionWithSession(req, coupleId, 'update', session)
      );
    } catch (error) {
      const recoveryRequired = error?.code === 'TRANSACTION_RECOVERY_REQUIRED';
      const topologyFallback = error?.code === 'TRANSACTION_UNAVAILABLE'
        && mongoose.connection?.readyState === 1;
      if (!recoveryRequired && !topologyFallback) throw error;
      const transaction = await findTransactionForMutation(req.params.id, coupleId);
      if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
      if (transaction.mutationStatus === 'pending'
        && String(req.body?.requestId || '') !== String(transaction.mutationRequestId || '')) {
        throw new WalletTransactionError('这条流水正在处理另一项修改，请稍后重试', 409, 'TRANSACTION_BUSY');
      }
      const input = transaction.mutationStatus === 'pending'
        ? inputFromStoredTransactionMutation(transaction)
        : await buildTransactionMutationInput(req, transaction, coupleId, 'update');
      result = await mutateTransactionWithoutSession(input);
    }

    const shouldBroadcast = !result.replay || result.completedNow;
    if (shouldBroadcast) {
      for (const account of result.touched) {
        emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(account), req.userId, result.input?.requestId || result.transaction.mutationRequestId);
      }
    }
    const payload = serializeTransaction(result.transaction);
    if (shouldBroadcast) {
      emitSync(req.app, coupleId, 'walletSync', 'transactionUpdate', payload, req.userId, result.input?.requestId || result.transaction.mutationRequestId);
    }
    return res.json({ success: true, replay: Boolean(result.replay), data: payload });
  } catch (error) {
    return respondError(res, error, '[Wallet] 更新流水失败');
  }
});

router.delete('/transactions/:id', authMiddleware, async (req, res) => {
  let coupleId;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
    ({ coupleId } = await requireCouple(req));
    let result;
    try {
      result = await walletRoutes.withWalletTransaction(
        session => mutateTransactionWithSession(req, coupleId, 'delete', session)
      );
    } catch (error) {
      const recoveryRequired = error?.code === 'TRANSACTION_RECOVERY_REQUIRED';
      const topologyFallback = error?.code === 'TRANSACTION_UNAVAILABLE'
        && mongoose.connection?.readyState === 1;
      if (!recoveryRequired && !topologyFallback) throw error;
      const transaction = await findTransactionForMutation(req.params.id, coupleId);
      if (!transaction) throw new WalletTransactionError('流水不存在', 404, 'NOT_FOUND');
      if (transaction.mutationStatus === 'pending'
        && String(req.body?.requestId || '') !== String(transaction.mutationRequestId || '')) {
        throw new WalletTransactionError('这条流水正在处理另一项操作，请稍后重试', 409, 'TRANSACTION_BUSY');
      }
      const input = transaction.mutationStatus === 'pending'
        ? inputFromStoredTransactionMutation(transaction)
        : await buildTransactionMutationInput(req, transaction, coupleId, 'delete');
      result = await mutateTransactionWithoutSession(input);
    }

    const shouldBroadcast = !result.replay || result.completedNow;
    if (shouldBroadcast) {
      for (const account of result.touched) {
        emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(account), req.userId, result.input?.requestId || result.transaction.mutationRequestId);
      }
    }
    if (shouldBroadcast) {
      emitSync(req.app, coupleId, 'walletSync', 'transactionDelete', { id: req.params.id }, req.userId, result.input?.requestId || result.transaction.mutationRequestId);
    }
    return res.json({ success: true, replay: Boolean(result.replay) });
  } catch (error) {
    return respondError(res, error, '[Wallet] 删除流水失败');
  }
});

module.exports = router;
module.exports.WalletTransactionError = WalletTransactionError;
module.exports.serializeTransaction = serializeTransaction;
