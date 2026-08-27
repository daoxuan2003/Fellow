const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');

const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { DebtPlan, MonthlyWalletPlan, DebtPayment } = require('../models/Wallet');
const { logError } = require('../utils/safeLogger');
const {
  allocatePayment,
  deriveOwnerSummary,
  generateInstallments,
  isLocalDate,
  localDateToDate,
  normalizePockets,
  paydayCycleForMonth,
  paydayCycleKey,
  rebalanceInstallmentAmount,
  roundMoney
} = require('../utils/walletPlanner');

const router = express.Router();
const PROVIDERS = new Set(['huabei', 'baitiao', 'credit_card', 'loan', 'other']);
const DEBT_SETUP_LOCK_MS = 60 * 1000;

class WalletMutationError extends Error {
  constructor(message, statusCode = 409, code = 'WALLET_MUTATION_FAILED') {
    super(message);
    this.name = 'WalletMutationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getCoupleId(userId, partnerId) {
  return [String(userId), String(partnerId)].sort().join('_');
}

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function transactionUnavailable(error) {
  const message = String(error?.message || '');
  return message.includes('Transaction numbers are only allowed')
    || message.includes('Current topology does not support sessions')
    || message.includes('Sessions are not supported');
}

async function withWalletTransaction(operation) {
  if (typeof mongoose.startSession !== 'function' || mongoose.connection?.readyState !== 1) {
    if (process.env.NODE_ENV === 'production') {
      throw new WalletMutationError('数据库暂不支持安全写入，请联系管理员', 503, 'TRANSACTION_UNAVAILABLE');
    }
    return operation(null);
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
      throw new WalletMutationError('数据库暂不支持安全还款，请联系管理员', 503, 'TRANSACTION_UNAVAILABLE');
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
}

async function requireCouple(req) {
  const user = await User.findById(req.userId);
  if (!user?.partnerId) throw new WalletMutationError('请先绑定伴侣', 400, 'PARTNER_REQUIRED');
  return {
    user,
    partnerId: String(user.partnerId),
    coupleId: getCoupleId(req.userId, user.partnerId)
  };
}

function emitSync(app, coupleId, type, action, payload, actor, requestId = null) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple) return;
  broadcastToCouple(coupleId, {
    type,
    data: { action, payload, actor, requestId, timestamp: Date.now() }
  });
}

function sessionOptions(session, extra = {}) {
  return session ? { ...extra, session } : extra;
}

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
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

function serializeDebt(debt) {
  const row = plain(debt);
  return {
    _id: row._id,
    ownerId: row.ownerId,
    liabilityAccountId: row.liabilityAccountId,
    name: row.name,
    provider: row.provider,
    originalAmount: row.originalAmount,
    feeAmount: row.feeAmount,
    outstandingAmount: row.outstandingAmount,
    firstDueDate: row.firstDueDate,
    installmentCount: row.installmentCount,
    schedule: (row.schedule || []).map(item => {
      const installment = plain(item);
      return {
        _id: installment._id,
        sequence: installment.sequence,
        dueDate: installment.dueDate,
        plannedAmount: installment.plannedAmount,
        paidAmount: installment.paidAmount,
        status: installment.status,
        paidAt: installment.paidAt,
        paidBy: installment.paidBy
      };
    }),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function serializeMonthlyPlan(plan) {
  const row = plain(plan);
  return {
    _id: row._id,
    ownerId: row.ownerId,
    month: row.month,
    expectedIncome: row.expectedIncome,
    pockets: row.pockets || [],
    updatedAt: row.updatedAt
  };
}

function serializePayment(payment) {
  const row = plain(payment);
  return {
    _id: row._id,
    debtPlanId: row.debtPlanId,
    payerId: row.payerId,
    debtOwnerId: row.debtOwnerId,
    assetAccountId: row.assetAccountId,
    liabilityAccountId: row.liabilityAccountId,
    amount: row.amount,
    transactionId: row.transactionId,
    allocations: (row.allocations || []).map(item => ({
      installmentId: item.installmentId,
      amount: item.amount
    })),
    createdAt: row.createdAt
  };
}

function buildTimeline(debts, plans) {
  const debtItems = debts.flatMap(debt => debt.schedule
    .filter(item => item.status !== 'paid')
    .map(item => ({
      id: `debt-${debt._id}-${item._id}`,
      type: 'debt_due',
      date: item.dueDate,
      ownerId: String(debt.ownerId),
      title: `${debt.name} 第 ${item.sequence} 期`,
      amount: roundMoney(Number(item.plannedAmount) - Number(item.paidAmount || 0)),
      debtPlanId: debt._id,
      installmentId: item._id,
      status: item.status
    })));
  const incomeItems = plans
    .filter(plan => plan.expectedIncome?.date && Number(plan.expectedIncome?.amount) > 0)
    .map(plan => ({
      id: `income-${plan._id}`,
      type: 'expected_income',
      date: plan.expectedIncome.date,
      ownerId: String(plan.ownerId),
      title: plan.expectedIncome.title || '预计收入',
      amount: Number(plan.expectedIncome.amount)
    }));
  return [...debtItems, ...incomeItems].sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    if (dateOrder) return dateOrder;
    if (a.type === b.type) return 0;
    return a.type === 'expected_income' ? -1 : 1;
  });
}

function respondError(res, error, logLabel) {
  if (error instanceof WalletMutationError) {
    return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, code: 'DUPLICATE', message: '操作已提交，请刷新查看' });
  }
  logError(logLabel, error);
  return res.status(500).json({ success: false, message: '服务器错误' });
}

function normalizeDebtCreationRequestId(value) {
  const requestId = String(value || '').trim();
  if (requestId.length > 80) {
    throw new WalletMutationError('提交标识无效，请重新打开表单', 400, 'INVALID_REQUEST_ID');
  }
  return requestId || `debt-create-${new mongoose.Types.ObjectId()}`;
}

function assertDebtCreationReplay(debt, input) {
  const sameRequest = String(debt.ownerId) === String(input.ownerId)
    && debt.name === input.name
    && debt.provider === input.provider
    && roundMoney(debt.originalAmount) === input.amount
    && roundMoney(debt.feeAmount) === input.feeAmount
    && debt.firstDueDate === input.firstDueDate
    && Number(debt.installmentCount) === input.installmentCount
    && (!input.liabilityAccountId
      || String(debt.liabilityAccountId) === String(input.liabilityAccountId));
  if (!sameRequest) {
    throw new WalletMutationError('这次提交已用于另一笔欠款，请重新打开表单', 409, 'REQUEST_ID_CONFLICT');
  }
}

async function findDebtCreation(input, session = null) {
  return DebtPlan.findOne({
    coupleId: input.coupleId,
    ownerId: input.ownerId,
    creationRequestId: input.requestId
  }, null, sessionOptions(session));
}

async function saveReadyDebtWithConfirmation(input, debt, session = null) {
  try {
    await debt.save(sessionOptions(session));
    return debt;
  } catch (error) {
    if (session) throw error;
    try {
      const persistedDebt = await findDebtCreation(input);
      if (persistedDebt?.setupStatus === 'ready') return persistedDebt;
    } catch (confirmationError) {
      error.walletSetupOutcomeUnknown = true;
      logError('[Wallet] 欠款完成状态确认失败', confirmationError);
    }
    throw error;
  }
}

async function releaseDebtSetupLock(input, accountId, session = null) {
  return Account.findOneAndUpdate(
    {
      _id: accountId,
      coupleId: input.coupleId,
      userId: input.ownerId,
      type: 'liability',
      debtSetupLockId: input.requestId
    },
    { $unset: { debtSetupLockId: '', debtSetupLockExpiresAt: '' } },
    sessionOptions(session, { new: true, runValidators: true })
  );
}

async function resumeDebtCreation(input, debt, session = null) {
  assertDebtCreationReplay(debt, input);
  const completedNow = debt.setupStatus === 'pending';
  let account = await Account.findOne({
    _id: debt.liabilityAccountId,
    coupleId: input.coupleId,
    userId: input.ownerId,
    type: 'liability'
  }, null, sessionOptions(session));
  if (!account) {
    throw new WalletMutationError('欠款关联账户不存在，请重新创建', 409, 'LIABILITY_ACCOUNT_MISSING');
  }

  if (debt.setupStatus === 'pending') {
    const createdAccount = Boolean(debt.setupCreatedAccount);
    const previousAccountBalance = Number(debt.setupPreviousAccountBalance || 0);
    const previousAccountUpdatedAt = debt.setupPreviousAccountUpdatedAt || null;
    const accountFilter = {
      _id: account._id,
      coupleId: input.coupleId,
      userId: input.ownerId,
      type: 'liability'
    };
    if (createdAccount) accountFilter.debtSetupRequestId = input.requestId;
    else accountFilter.debtSetupLockId = input.requestId;
    const accountUpdate = {
      $set: { balance: input.total, isArchived: false, updatedAt: new Date() }
    };
    if (createdAccount) {
      accountUpdate.$unset = { debtSetupLockId: '', debtSetupLockExpiresAt: '' };
    }
    account = await Account.findOneAndUpdate(
      accountFilter,
      accountUpdate,
      sessionOptions(session, { new: true, runValidators: true })
    );
    if (!account) {
      throw new WalletMutationError('欠款账户状态已变化，请刷新后重试', 409, 'STALE_LIABILITY_ACCOUNT');
    }
    debt.setupStatus = 'ready';
    debt.setupPreviousAccountBalance = undefined;
    debt.setupPreviousAccountUpdatedAt = undefined;
    try {
      debt = await saveReadyDebtWithConfirmation(input, debt, session);
    } catch (error) {
      if (!session && !error.walletSetupOutcomeUnknown) {
        try {
          if (createdAccount) {
            await Account.findOneAndUpdate(
              {
                _id: account._id,
                coupleId: input.coupleId,
                userId: input.ownerId,
                debtSetupRequestId: input.requestId,
                balance: input.total
              },
              { $set: { isArchived: true, updatedAt: new Date() } },
              { new: true, runValidators: true }
            );
          } else {
            await Account.findOneAndUpdate(
              {
                _id: account._id,
                coupleId: input.coupleId,
                userId: input.ownerId,
                debtSetupLockId: input.requestId,
                balance: input.total
              },
              {
                $set: {
                  balance: previousAccountBalance,
                  updatedAt: previousAccountUpdatedAt || new Date()
                },
                $unset: { debtSetupLockId: '', debtSetupLockExpiresAt: '' }
              },
              { new: true, runValidators: true }
            );
          }
        } catch (rollbackError) {
          logError('[Wallet] 欠款恢复补偿失败', rollbackError);
        }
      }
      debt.setupStatus = 'pending';
      throw error;
    }
    if (!createdAccount) account = await releaseDebtSetupLock(input, account._id, session) || account;
  } else {
    account = await releaseDebtSetupLock(input, account._id, session) || account;
  }
  return { replay: true, completedNow, debt, liabilityAccount: account };
}

async function createDebtWithTransaction(input, session) {
  const replay = await findDebtCreation(input, session);
  if (replay) return resumeDebtCreation(input, replay, session);

  let liabilityAccount;
  if (input.liabilityAccountId) {
    liabilityAccount = await Account.findOne({
      _id: input.liabilityAccountId,
      coupleId: input.coupleId,
      userId: input.ownerId,
      type: 'liability',
      isArchived: false
    }, null, sessionOptions(session));
    if (!liabilityAccount) {
      throw new WalletMutationError('请选择自己的负债账户', 400, 'INVALID_LIABILITY_ACCOUNT');
    }
    const existingPlan = await DebtPlan.findOne({
      coupleId: input.coupleId,
      liabilityAccountId: liabilityAccount._id,
      status: 'active',
      setupStatus: { $ne: 'pending' }
    }, null, sessionOptions(session));
    if (existingPlan) {
      throw new WalletMutationError('该账户已有进行中的还款计划', 409, 'ACCOUNT_ALREADY_LINKED');
    }
    liabilityAccount.balance = input.total;
    liabilityAccount.updatedAt = new Date();
    await liabilityAccount.save(sessionOptions(session));
  } else {
    liabilityAccount = new Account({
      coupleId: input.coupleId,
      userId: input.ownerId,
      name: input.name,
      type: 'liability',
      subType: input.provider === 'other' ? 'other_liability' : input.provider,
      currency: 'CNY',
      balance: input.total,
      icon: '欠',
      color: '#FF7FA5',
      debtSetupRequestId: input.requestId
    });
    await liabilityAccount.save(sessionOptions(session));
  }

  const debt = new DebtPlan({
    coupleId: input.coupleId,
    ownerId: input.ownerId,
    liabilityAccountId: liabilityAccount._id,
    name: input.name,
    provider: input.provider,
    originalAmount: input.amount,
    feeAmount: input.feeAmount,
    outstandingAmount: input.total,
    firstDueDate: input.firstDueDate,
    installmentCount: input.installmentCount,
    schedule: input.schedule,
    creationRequestId: input.requestId,
    setupStatus: 'ready',
    setupCreatedAccount: !input.liabilityAccountId
  });
  await debt.save(sessionOptions(session));
  return { replay: false, debt, liabilityAccount };
}

async function acquireDebtSetupAccount(input) {
  const now = new Date();
  const account = await Account.findOneAndUpdate(
    {
      _id: input.liabilityAccountId,
      coupleId: input.coupleId,
      userId: input.ownerId,
      type: 'liability',
      isArchived: false,
      $or: [
        { debtSetupLockId: { $exists: false } },
        { debtSetupLockId: null },
        { debtSetupLockId: input.requestId },
        { debtSetupLockExpiresAt: { $lte: now } }
      ]
    },
    {
      $set: {
        debtSetupLockId: input.requestId,
        debtSetupLockExpiresAt: new Date(now.getTime() + DEBT_SETUP_LOCK_MS)
      }
    },
    { new: true, runValidators: true }
  );
  if (account) return account;

  const ownedAccount = await Account.findOne({
    _id: input.liabilityAccountId,
    coupleId: input.coupleId,
    userId: input.ownerId,
    type: 'liability',
    isArchived: false
  });
  if (!ownedAccount) {
    throw new WalletMutationError('请选择自己的负债账户', 400, 'INVALID_LIABILITY_ACCOUNT');
  }
  throw new WalletMutationError('这个负债账户正在处理另一笔计划，请稍后重试', 409, 'LIABILITY_ACCOUNT_BUSY');
}

async function rollbackDebtCreation(input, state) {
  try {
    if (state.debt && !state.completed) {
      await DebtPlan.deleteOne({
        _id: state.debt._id,
        coupleId: input.coupleId,
        ownerId: input.ownerId,
        creationRequestId: input.requestId,
        setupStatus: 'pending'
      });
    }
    if (state.createdAccount && state.liabilityAccount) {
      await Account.deleteOne({
        _id: state.liabilityAccount._id,
        coupleId: input.coupleId,
        userId: input.ownerId,
        debtSetupRequestId: input.requestId
      });
      return;
    }
    if (state.lockAcquired && state.liabilityAccount) {
      await Account.findOneAndUpdate(
        {
          _id: state.liabilityAccount._id,
          coupleId: input.coupleId,
          userId: input.ownerId,
          type: 'liability',
          debtSetupLockId: input.requestId,
          balance: input.total
        },
        {
          $set: {
            balance: state.previousBalance,
            updatedAt: state.previousUpdatedAt || new Date()
          },
          $unset: { debtSetupLockId: '', debtSetupLockExpiresAt: '' }
        },
        { new: true, runValidators: true }
      );
      await releaseDebtSetupLock(input, state.liabilityAccount._id);
    }
  } catch (rollbackError) {
    logError('[Wallet] 欠款初始化补偿失败', rollbackError);
  }
}

async function createDebtWithoutTransaction(input) {
  const replay = await findDebtCreation(input);
  if (replay) return resumeDebtCreation(input, replay);

  const state = {
    liabilityAccount: null,
    debt: null,
    createdAccount: !input.liabilityAccountId,
    lockAcquired: false,
    previousBalance: null,
    previousUpdatedAt: null,
    completed: false
  };
  try {
    if (input.liabilityAccountId) {
      state.liabilityAccount = await acquireDebtSetupAccount(input);
      state.lockAcquired = true;
      state.previousBalance = Number(state.liabilityAccount.balance || 0);
      state.previousUpdatedAt = state.liabilityAccount.updatedAt || null;
      const existingPlan = await DebtPlan.findOne({
        coupleId: input.coupleId,
        liabilityAccountId: state.liabilityAccount._id,
        status: 'active',
        setupStatus: { $ne: 'pending' }
      });
      if (existingPlan) {
        throw new WalletMutationError('该账户已有进行中的还款计划', 409, 'ACCOUNT_ALREADY_LINKED');
      }
    } else {
      state.liabilityAccount = await Account.findOne({
        coupleId: input.coupleId,
        userId: input.ownerId,
        debtSetupRequestId: input.requestId
      });
      if (!state.liabilityAccount) {
        state.liabilityAccount = new Account({
          coupleId: input.coupleId,
          userId: input.ownerId,
          name: input.name,
          type: 'liability',
          subType: input.provider === 'other' ? 'other_liability' : input.provider,
          currency: 'CNY',
          balance: input.total,
          icon: '欠',
          color: '#FF7FA5',
          isArchived: true,
          debtSetupRequestId: input.requestId
        });
        try {
          await state.liabilityAccount.save();
        } catch (error) {
          if (error?.code !== 11000) throw error;
          state.liabilityAccount = await Account.findOne({
            coupleId: input.coupleId,
            userId: input.ownerId,
            debtSetupRequestId: input.requestId
          });
          if (!state.liabilityAccount) throw error;
        }
      }
    }

    state.debt = new DebtPlan({
      coupleId: input.coupleId,
      ownerId: input.ownerId,
      liabilityAccountId: state.liabilityAccount._id,
      name: input.name,
      provider: input.provider,
      originalAmount: input.amount,
      feeAmount: input.feeAmount,
      outstandingAmount: input.total,
      firstDueDate: input.firstDueDate,
      installmentCount: input.installmentCount,
      schedule: input.schedule,
      creationRequestId: input.requestId,
      setupStatus: 'pending',
      setupCreatedAccount: state.createdAccount,
      setupPreviousAccountBalance: state.createdAccount ? undefined : state.previousBalance,
      setupPreviousAccountUpdatedAt: state.createdAccount ? undefined : state.previousUpdatedAt
    });
    try {
      await state.debt.save();
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const concurrentReplay = await findDebtCreation(input);
      if (!concurrentReplay) throw error;
      return resumeDebtCreation(input, concurrentReplay);
    }

    const accountFilter = {
      _id: state.liabilityAccount._id,
      coupleId: input.coupleId,
      userId: input.ownerId,
      type: 'liability'
    };
    if (state.createdAccount) accountFilter.debtSetupRequestId = input.requestId;
    else accountFilter.debtSetupLockId = input.requestId;
    const accountUpdate = {
      $set: { balance: input.total, isArchived: false, updatedAt: new Date() }
    };
    if (state.createdAccount) {
      accountUpdate.$unset = { debtSetupLockId: '', debtSetupLockExpiresAt: '' };
    }
    const updatedLiabilityAccount = await Account.findOneAndUpdate(
      accountFilter,
      accountUpdate,
      { new: true, runValidators: true }
    );
    if (!updatedLiabilityAccount) {
      throw new WalletMutationError('欠款账户状态已变化，请刷新后重试', 409, 'STALE_LIABILITY_ACCOUNT');
    }
    state.liabilityAccount = updatedLiabilityAccount;

    state.debt.setupStatus = 'ready';
    state.debt.setupPreviousAccountBalance = undefined;
    state.debt.setupPreviousAccountUpdatedAt = undefined;
    state.debt = await saveReadyDebtWithConfirmation(input, state.debt);
    state.completed = true;
    if (!state.createdAccount) {
      state.liabilityAccount = await releaseDebtSetupLock(input, state.liabilityAccount._id) || state.liabilityAccount;
    }
    return { replay: false, debt: state.debt, liabilityAccount: state.liabilityAccount };
  } catch (error) {
    if (!error.walletSetupOutcomeUnknown) {
      await rollbackDebtCreation(input, state);
    }
    throw error;
  }
}

function includePaymentMutationFields(query) {
  return typeof query?.select === 'function'
    ? query.select([
        '+requestHash',
        '+mutationPaidAt',
        '+mutationNote',
        '+mutationPreviousOutstandingAmount',
        '+mutationPreviousDebtStatus',
        '+mutationPreviousSchedule',
        '+mutationNextOutstandingAmount',
        '+mutationNextDebtStatus',
        '+mutationNextSchedule'
      ].join(' '))
    : query;
}

function includeDebtPaymentMarker(query) {
  return typeof query?.select === 'function' ? query.select('+paymentMutationRequestId') : query;
}

function includeAccountWalletMarker(query) {
  return typeof query?.select === 'function'
    ? query.select('+walletMutationRequestId +walletMutationPreviousBalance +walletMutationPreviousUpdatedAt')
    : query;
}

async function findPayment(input, session = null) {
  return includePaymentMutationFields(DebtPayment.findOne(
    { coupleId: input.coupleId, requestId: input.requestId },
    null,
    sessionOptions(session)
  ));
}

function paymentRequestHash(input) {
  return crypto.createHash('sha256').update(JSON.stringify([
    input.debtPlanId,
    input.payerId,
    input.assetAccountId,
    input.amount,
    input.installmentId,
    input.note
  ])).digest('hex');
}

function assertPaymentReplay(payment, input) {
  if ((payment.requestHash && payment.requestHash !== paymentRequestHash(input))
    || String(payment.debtPlanId) !== String(input.debtPlanId)
    || String(payment.payerId) !== String(input.payerId)
    || String(payment.assetAccountId) !== String(input.assetAccountId)
    || roundMoney(payment.amount) !== input.amount) {
    throw new WalletMutationError('这次提交已用于另一笔还款，请重新打开表单', 409, 'REQUEST_ID_CONFLICT');
  }
}

function cloneSchedule(schedule) {
  return (schedule || []).map(row => ({ ...plain(row) }));
}

async function preparePayment(input, session = null) {
  const debt = await includeDebtPaymentMarker(DebtPlan.findOne({
    _id: input.debtPlanId,
    coupleId: input.coupleId,
    status: 'active',
    setupStatus: { $ne: 'pending' }
  }, null, sessionOptions(session)));
  if (!debt) throw new WalletMutationError('欠款计划不存在或已还清', 404, 'DEBT_NOT_FOUND');
  if (input.amount > Number(debt.outstandingAmount)) {
    throw new WalletMutationError('还款金额不能超过剩余欠款', 400, 'PAYMENT_TOO_LARGE');
  }
  const assetAccount = await Account.findOne({
    _id: input.assetAccountId,
    coupleId: input.coupleId,
    userId: input.payerId,
    type: 'asset',
    isArchived: false
  }, null, sessionOptions(session));
  if (!assetAccount) throw new WalletMutationError('只能使用自己的资产账户还款', 403, 'PAYER_ACCOUNT_ONLY');
  if (Number(assetAccount.balance) < input.amount) {
    throw new WalletMutationError('付款账户余额不足', 409, 'INSUFFICIENT_FUNDS');
  }
  const liabilityAccount = await Account.findOne({
    _id: debt.liabilityAccountId,
    coupleId: input.coupleId,
    userId: debt.ownerId,
    type: 'liability',
    isArchived: false
  }, null, sessionOptions(session));
  if (!liabilityAccount) throw new WalletMutationError('关联负债账户不存在', 409, 'LIABILITY_ACCOUNT_MISSING');
  if (Number(liabilityAccount.balance) < input.amount) {
    throw new WalletMutationError('还款金额超过账户负债余额，请先校准账户', 409, 'LIABILITY_BALANCE_MISMATCH');
  }

  const paidAt = new Date();
  const previousSchedule = cloneSchedule(debt.schedule);
  const nextSchedule = cloneSchedule(debt.schedule);
  let allocations;
  try {
    allocations = allocatePayment(nextSchedule, input.amount, input.installmentId, {
      paidAt,
      paidBy: input.payerId,
      paymentReference: input.requestId
    });
  } catch (error) {
    throw new WalletMutationError('还款金额超出所选期次后的待还计划，请刷新后重试', 409, 'SCHEDULE_MISMATCH');
  }
  const nextOutstandingAmount = roundMoney(Number(debt.outstandingAmount) - input.amount);
  return {
    debt,
    assetAccount,
    liabilityAccount,
    paidAt,
    allocations,
    previousSchedule,
    nextSchedule,
    nextOutstandingAmount,
    nextDebtStatus: nextOutstandingAmount === 0 ? 'paid' : debt.status
  };
}

async function createPaymentWithTransaction(input, session) {
  const replay = await findPayment(input, session);
  if (replay) {
    assertPaymentReplay(replay, input);
    if (replay.mutationStatus !== 'ready') {
      throw new WalletMutationError('这笔还款需要继续恢复，请重试', 409, 'PAYMENT_RECOVERY_REQUIRED');
    }
    return { replay: true, payment: replay };
  }
  const prepared = await preparePayment(input, session);
  const updatedAsset = await Account.findOneAndUpdate(
    {
      _id: prepared.assetAccount._id,
      coupleId: input.coupleId,
      userId: input.payerId,
      type: 'asset',
      balance: { $gte: input.amount }
    },
    { $inc: { balance: -input.amount }, $set: { updatedAt: prepared.paidAt } },
    sessionOptions(session, { new: true, runValidators: true })
  );
  if (!updatedAsset) throw new WalletMutationError('付款账户余额已变化，请刷新后重试', 409, 'STALE_ASSET_BALANCE');
  const updatedLiability = await Account.findOneAndUpdate(
    {
      _id: prepared.liabilityAccount._id,
      coupleId: input.coupleId,
      userId: prepared.debt.ownerId,
      type: 'liability',
      balance: { $gte: input.amount }
    },
    { $inc: { balance: -input.amount }, $set: { updatedAt: prepared.paidAt } },
    sessionOptions(session, { new: true, runValidators: true })
  );
  if (!updatedLiability) throw new WalletMutationError('负债余额已变化，请刷新后重试', 409, 'STALE_LIABILITY_BALANCE');

  prepared.debt.outstandingAmount = prepared.nextOutstandingAmount;
  prepared.debt.status = prepared.nextDebtStatus;
  prepared.debt.schedule = prepared.nextSchedule;
  await prepared.debt.save(sessionOptions(session));
  const transaction = new Transaction({
    coupleId: input.coupleId,
    type: 'transfer',
    kind: 'debt_payment',
    amount: input.amount,
    currency: 'CNY',
    category: '债务还款',
    accountId: prepared.assetAccount._id,
    toAccountId: prepared.liabilityAccount._id,
    debtPlanId: prepared.debt._id,
    installmentId: prepared.allocations[0]?.installmentId || null,
    requestId: input.requestId,
    date: localDateToDate(localDateParts(prepared.paidAt)),
    note: input.note,
    creatorId: input.payerId,
    mutationStatus: 'ready'
  });
  await transaction.save(sessionOptions(session));
  const payment = new DebtPayment({
    coupleId: input.coupleId,
    debtPlanId: prepared.debt._id,
    payerId: input.payerId,
    debtOwnerId: prepared.debt.ownerId,
    assetAccountId: prepared.assetAccount._id,
    liabilityAccountId: prepared.liabilityAccount._id,
    amount: input.amount,
    requestId: input.requestId,
    requestHash: paymentRequestHash(input),
    transactionId: transaction._id,
    allocations: prepared.allocations,
    mutationStatus: 'ready'
  });
  await payment.save(sessionOptions(session));
  return {
    replay: false,
    payment,
    debt: prepared.debt,
    updatedAsset,
    updatedLiability,
    transaction
  };
}

async function findPaymentAccount(input, accountId, ownerId, type) {
  return includeAccountWalletMarker(Account.findOne({
    _id: accountId,
    coupleId: input.coupleId,
    userId: ownerId,
    type,
    isArchived: false
  }));
}

async function findPaymentMarkerOperation(coupleId, requestId) {
  const payment = await DebtPayment.findOne({ coupleId, requestId });
  if (payment) return payment;
  const transaction = await Transaction.findOne({
    coupleId,
    $or: [{ requestId }, { mutationRequestId: requestId }]
  });
  return transaction;
}

async function paymentMarkerIsReplaceable(coupleId, requestId) {
  const operation = await findPaymentMarkerOperation(coupleId, requestId);
  return Boolean(operation && operation.mutationStatus === 'ready');
}

async function repairOrRejectPaymentAccountMarker(input, account, ownerId, type) {
  const marker = String(account.walletMutationRequestId || '');
  if (!marker || marker === input.requestId) return account;
  const blockingOperation = await findPaymentMarkerOperation(input.coupleId, marker);
  if (blockingOperation?.mutationStatus === 'ready') return account;
  if (blockingOperation) {
    throw new WalletMutationError('这个账户正在处理另一项钱包操作，请稍后重试', 409, 'ACCOUNT_BUSY');
  }
  const previousBalance = Number(account.walletMutationPreviousBalance);
  if (Number.isFinite(previousBalance)) {
    await Account.findOneAndUpdate(
      {
        _id: account._id,
        coupleId: input.coupleId,
        userId: ownerId,
        type,
        walletMutationRequestId: marker
      },
      {
        $set: {
          balance: previousBalance,
          updatedAt: account.walletMutationPreviousUpdatedAt || new Date()
        },
        $unset: {
          walletMutationRequestId: '',
          walletMutationPreviousBalance: '',
          walletMutationPreviousUpdatedAt: ''
        }
      },
      { new: true, runValidators: true }
    );
    return findPaymentAccount(input, account._id, ownerId, type);
  }
  throw new WalletMutationError('这个账户正在处理另一项钱包操作，请稍后重试', 409, 'ACCOUNT_BUSY');
}

async function applyPaymentAccountDeltaOnce(input, accountId, ownerId, type) {
  let account = await findPaymentAccount(input, accountId, ownerId, type);
  if (!account) throw new WalletMutationError('还款账户不存在或已归档', 409, 'ACCOUNT_MISSING');
  if (String(account.walletMutationRequestId || '') === input.requestId) return account;
  account = await repairOrRejectPaymentAccountMarker(input, account, ownerId, type);
  let replaceableMarker = null;
  if (account.walletMutationRequestId) {
    if (!(await paymentMarkerIsReplaceable(input.coupleId, account.walletMutationRequestId))) {
      throw new WalletMutationError('这个账户正在处理另一项钱包操作，请稍后重试', 409, 'ACCOUNT_BUSY');
    }
    replaceableMarker = String(account.walletMutationRequestId);
  }
  const previousBalance = Number(account.balance);
  if (previousBalance < input.amount) {
    throw new WalletMutationError(type === 'asset' ? '付款账户余额不足' : '还款金额超过账户负债余额，请先校准账户', 409, type === 'asset' ? 'INSUFFICIENT_FUNDS' : 'LIABILITY_BALANCE_MISMATCH');
  }
  const updatedQuery = Account.findOneAndUpdate(
    {
      _id: account._id,
      coupleId: input.coupleId,
      userId: ownerId,
      type,
      isArchived: false,
      balance: previousBalance,
      $or: [
        { walletMutationRequestId: { $exists: false } },
        { walletMutationRequestId: null },
        ...(replaceableMarker ? [{ walletMutationRequestId: replaceableMarker }] : [])
      ]
    },
    {
      $inc: { balance: -input.amount },
      $set: {
        walletMutationRequestId: input.requestId,
        walletMutationPreviousBalance: previousBalance,
        walletMutationPreviousUpdatedAt: account.updatedAt || new Date(),
        updatedAt: new Date()
      }
    },
    { new: true, runValidators: true }
  );
  const updated = await includeAccountWalletMarker(updatedQuery);
  if (updated) return updated;
  account = await findPaymentAccount(input, accountId, ownerId, type);
  if (String(account?.walletMutationRequestId || '') === input.requestId) return account;
  throw new WalletMutationError('账户余额已变化，请刷新后重试', 409, 'STALE_ACCOUNT_BALANCE');
}

async function releasePaymentAccount(input, accountId, ownerId, type) {
  return Account.findOneAndUpdate(
    {
      _id: accountId,
      coupleId: input.coupleId,
      userId: ownerId,
      type,
      walletMutationRequestId: input.requestId
    },
    { $unset: { walletMutationPreviousBalance: '', walletMutationPreviousUpdatedAt: '' } },
    { new: true, runValidators: true }
  );
}

async function rollbackPaymentAccount(input, accountId, ownerId, type) {
  const account = await findPaymentAccount(input, accountId, ownerId, type);
  if (!account || String(account.walletMutationRequestId || '') !== input.requestId) return true;
  const previousBalance = Number(account.walletMutationPreviousBalance);
  if (!Number.isFinite(previousBalance)) return false;
  const restored = await Account.findOneAndUpdate(
    {
      _id: accountId,
      coupleId: input.coupleId,
      userId: ownerId,
      type,
      walletMutationRequestId: input.requestId
    },
    {
      $set: {
        balance: previousBalance,
        updatedAt: account.walletMutationPreviousUpdatedAt || new Date()
      },
      $unset: {
        walletMutationRequestId: '',
        walletMutationPreviousBalance: '',
        walletMutationPreviousUpdatedAt: ''
      }
    },
    { new: true, runValidators: true }
  );
  return Boolean(restored);
}

async function applyPaymentDebtOnce(input, payment) {
  let debt = await includeDebtPaymentMarker(DebtPlan.findOne({
    _id: payment.debtPlanId,
    coupleId: input.coupleId,
    ownerId: payment.debtOwnerId
  }));
  if (!debt) throw new WalletMutationError('欠款计划不存在', 404, 'DEBT_NOT_FOUND');
  if (String(debt.paymentMutationRequestId || '') === input.requestId) return debt;
  let replaceableMarker = null;
  if (debt.paymentMutationRequestId) {
    const prior = await DebtPayment.findOne({ coupleId: input.coupleId, requestId: debt.paymentMutationRequestId });
    if (!prior || prior.mutationStatus !== 'ready') {
      throw new WalletMutationError('这笔欠款正在处理另一笔还款，请稍后重试', 409, 'DEBT_BUSY');
    }
    replaceableMarker = String(debt.paymentMutationRequestId);
  }
  const updatedQuery = DebtPlan.findOneAndUpdate(
    {
      _id: payment.debtPlanId,
      coupleId: input.coupleId,
      ownerId: payment.debtOwnerId,
      outstandingAmount: payment.mutationPreviousOutstandingAmount,
      $or: [
        { paymentMutationRequestId: { $exists: false } },
        { paymentMutationRequestId: null },
        ...(replaceableMarker ? [{ paymentMutationRequestId: replaceableMarker }] : [])
      ]
    },
    {
      $set: {
        outstandingAmount: payment.mutationNextOutstandingAmount,
        status: payment.mutationNextDebtStatus,
        schedule: payment.mutationNextSchedule,
        paymentMutationRequestId: input.requestId
      }
    },
    { new: true, runValidators: true }
  );
  const updated = await includeDebtPaymentMarker(updatedQuery);
  if (updated) return updated;
  debt = await includeDebtPaymentMarker(DebtPlan.findOne({ _id: payment.debtPlanId, coupleId: input.coupleId }));
  if (String(debt?.paymentMutationRequestId || '') === input.requestId) return debt;
  throw new WalletMutationError('欠款余额已变化，请刷新后重试', 409, 'STALE_DEBT_BALANCE');
}

async function rollbackPaymentDebt(input, payment) {
  const debt = await includeDebtPaymentMarker(DebtPlan.findOne({
    _id: payment.debtPlanId,
    coupleId: input.coupleId,
    ownerId: payment.debtOwnerId
  }));
  if (!debt || String(debt.paymentMutationRequestId || '') !== input.requestId) return true;
  const restored = await DebtPlan.findOneAndUpdate(
    {
      _id: payment.debtPlanId,
      coupleId: input.coupleId,
      ownerId: payment.debtOwnerId,
      paymentMutationRequestId: input.requestId
    },
    {
      $set: {
        outstandingAmount: payment.mutationPreviousOutstandingAmount,
        status: payment.mutationPreviousDebtStatus,
        schedule: payment.mutationPreviousSchedule
      },
      $unset: { paymentMutationRequestId: '' }
    },
    { new: true, runValidators: true }
  );
  return Boolean(restored);
}

function assertPaymentTransaction(transaction, input, payment) {
  if (transaction.kind !== 'debt_payment'
    || String(transaction.debtPlanId) !== String(payment.debtPlanId)
    || String(transaction.creatorId) !== input.payerId
    || roundMoney(transaction.amount) !== input.amount) {
    throw new WalletMutationError('还款流水提交标识冲突，请重新打开表单', 409, 'REQUEST_ID_CONFLICT');
  }
}

async function ensurePaymentTransaction(input, payment) {
  let transaction = await Transaction.findOne({ coupleId: input.coupleId, requestId: input.requestId });
  if (!transaction) {
    transaction = new Transaction({
      _id: payment.transactionId,
      coupleId: input.coupleId,
      type: 'transfer',
      kind: 'debt_payment',
      amount: input.amount,
      currency: 'CNY',
      category: '债务还款',
      accountId: payment.assetAccountId,
      toAccountId: payment.liabilityAccountId,
      debtPlanId: payment.debtPlanId,
      installmentId: payment.allocations[0]?.installmentId || null,
      requestId: input.requestId,
      date: localDateToDate(localDateParts(payment.mutationPaidAt)),
      note: payment.mutationNote || '',
      creatorId: input.payerId,
      mutationStatus: 'pending'
    });
    try {
      await transaction.save();
    } catch (error) {
      const persisted = await Transaction.findOne({ coupleId: input.coupleId, requestId: input.requestId });
      if (!persisted) throw error;
      transaction = persisted;
    }
  }
  assertPaymentTransaction(transaction, input, payment);
  if (transaction.mutationStatus === 'ready') return transaction;
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
  if (ready) return ready;
  const persisted = await Transaction.findOne({ coupleId: input.coupleId, requestId: input.requestId });
  if (persisted?.mutationStatus === 'ready') return persisted;
  throw new WalletMutationError('还款流水完成状态已变化，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
}

async function markPaymentReady(input, payment) {
  const readyQuery = DebtPayment.findOneAndUpdate(
    {
      _id: payment._id,
      coupleId: input.coupleId,
      requestId: input.requestId,
      mutationStatus: 'pending'
    },
    {
      $set: { mutationStatus: 'ready' },
      $unset: {
        mutationPaidAt: '',
        mutationNote: '',
        mutationPreviousOutstandingAmount: '',
        mutationPreviousDebtStatus: '',
        mutationPreviousSchedule: '',
        mutationNextOutstandingAmount: '',
        mutationNextDebtStatus: '',
        mutationNextSchedule: ''
      }
    },
    { new: true, runValidators: true }
  );
  const ready = await includePaymentMutationFields(readyQuery);
  if (ready) return { payment: ready, completedNow: true };
  const persisted = await findPayment(input);
  if (persisted?.mutationStatus === 'ready') return { payment: persisted, completedNow: false };
  throw new WalletMutationError('还款完成状态已变化，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
}

async function compensatePayment(input, payment) {
  let claim = payment;
  if (payment.mutationStatus === 'pending') {
    const claimQuery = DebtPayment.findOneAndUpdate(
      { _id: payment._id, coupleId: input.coupleId, requestId: input.requestId, mutationStatus: 'pending' },
      { $set: { mutationStatus: 'compensating' } },
      { new: true, runValidators: true }
    );
    claim = await includePaymentMutationFields(claimQuery);
  }
  if (!claim) {
    const persisted = await findPayment(input);
    if (persisted?.mutationStatus === 'ready') return { completed: true, payment: persisted };
    throw new WalletMutationError('还款恢复状态已变化，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
  }

  const transaction = await Transaction.findOne({ coupleId: input.coupleId, requestId: input.requestId });
  if (transaction) {
    assertPaymentTransaction(transaction, input, claim);
    const deletion = await Transaction.deleteOne({
      _id: transaction._id,
      coupleId: input.coupleId,
      requestId: input.requestId,
      kind: 'debt_payment'
    });
    if (deletion.deletedCount !== 1) {
      throw new WalletMutationError('还款流水正在恢复，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
    }
  }
  if (!(await rollbackPaymentDebt(input, claim))) {
    throw new WalletMutationError('欠款计划正在恢复，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
  }
  if (!(await rollbackPaymentAccount(input, claim.liabilityAccountId, claim.debtOwnerId, 'liability'))
    || !(await rollbackPaymentAccount(input, claim.assetAccountId, input.payerId, 'asset'))) {
    throw new WalletMutationError('还款账户正在恢复，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
  }
  const deletion = await DebtPayment.deleteOne({
    _id: claim._id,
    coupleId: input.coupleId,
    requestId: input.requestId,
    mutationStatus: 'compensating'
  });
  if (deletion.deletedCount !== 1) {
    throw new WalletMutationError('还款恢复结果无法确认，请稍后重试', 409, 'PAYMENT_RECOVERY_BUSY');
  }
  return { completed: false };
}

async function createPaymentWithoutTransaction(input) {
  let payment = await findPayment(input);
  let replay = Boolean(payment);
  if (payment) {
    assertPaymentReplay(payment, input);
    if (payment.mutationStatus === 'ready') {
      const [asset, liability, debt, transaction] = await Promise.all([
        releasePaymentAccount(input, payment.assetAccountId, input.payerId, 'asset'),
        releasePaymentAccount(input, payment.liabilityAccountId, payment.debtOwnerId, 'liability'),
        DebtPlan.findOne({ _id: payment.debtPlanId, coupleId: input.coupleId }),
        Transaction.findOne({ coupleId: input.coupleId, requestId: input.requestId })
      ]);
      return { replay: true, completedNow: false, payment, debt, updatedAsset: asset, updatedLiability: liability, transaction };
    }
    if (payment.mutationStatus === 'compensating') {
      await compensatePayment(input, payment);
      payment = null;
      replay = false;
    }
  }
  if (!payment) {
    const prepared = await preparePayment(input);
    payment = new DebtPayment({
      coupleId: input.coupleId,
      debtPlanId: prepared.debt._id,
      payerId: input.payerId,
      debtOwnerId: prepared.debt.ownerId,
      assetAccountId: prepared.assetAccount._id,
      liabilityAccountId: prepared.liabilityAccount._id,
      amount: input.amount,
      requestId: input.requestId,
      requestHash: paymentRequestHash(input),
      transactionId: new mongoose.Types.ObjectId(),
      allocations: prepared.allocations,
      mutationStatus: 'pending',
      mutationPaidAt: prepared.paidAt,
      mutationNote: input.note,
      mutationPreviousOutstandingAmount: Number(prepared.debt.outstandingAmount),
      mutationPreviousDebtStatus: prepared.debt.status,
      mutationPreviousSchedule: prepared.previousSchedule,
      mutationNextOutstandingAmount: prepared.nextOutstandingAmount,
      mutationNextDebtStatus: prepared.nextDebtStatus,
      mutationNextSchedule: prepared.nextSchedule
    });
    try {
      await payment.save();
    } catch (error) {
      const concurrent = await findPayment(input);
      if (!concurrent) throw error;
      assertPaymentReplay(concurrent, input);
      payment = concurrent;
      replay = true;
    }
  }

  try {
    const updatedAsset = await applyPaymentAccountDeltaOnce(input, payment.assetAccountId, input.payerId, 'asset');
    const updatedLiability = await applyPaymentAccountDeltaOnce(input, payment.liabilityAccountId, payment.debtOwnerId, 'liability');
    const debt = await applyPaymentDebtOnce(input, payment);
    const transaction = await ensurePaymentTransaction(input, payment);
    const completion = await markPaymentReady(input, payment);
    payment = completion.payment;
    const releasedAsset = await releasePaymentAccount(input, payment.assetAccountId, input.payerId, 'asset') || updatedAsset;
    const releasedLiability = await releasePaymentAccount(input, payment.liabilityAccountId, payment.debtOwnerId, 'liability') || updatedLiability;
    return {
      replay,
      completedNow: completion.completedNow,
      payment,
      debt,
      updatedAsset: releasedAsset,
      updatedLiability: releasedLiability,
      transaction
    };
  } catch (error) {
    const persisted = await findPayment(input);
    if (persisted?.mutationStatus === 'ready') {
      return createPaymentWithoutTransaction(input);
    }
    await compensatePayment(input, persisted || payment);
    throw error;
  }
}

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { user, partnerId, coupleId } = await requireCouple(req);
    const today = localDateParts();
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? req.query.month : paydayCycleKey(today);
    const cycle = paydayCycleForMonth(month);
    const [accounts, debts, plans, users] = await Promise.all([
      Account.find({ coupleId, isArchived: false }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
      DebtPlan.find({ coupleId, status: { $ne: 'archived' }, setupStatus: { $ne: 'pending' } }).sort({ createdAt: -1 }).lean(),
      MonthlyWalletPlan.find({ coupleId, month }).lean(),
      User.find({ _id: { $in: [req.userId, partnerId] } }).select('_id nickname avatar').lean()
    ]);
    const identities = users.map(row => ({
      userId: String(row._id),
      nickname: row.nickname || (String(row._id) === String(req.userId) ? '我' : '伴侣'),
      avatar: row.avatar || ''
    }));
    const ownerIds = [String(req.userId), partnerId];
    const summaries = ownerIds.map(ownerId => {
      const monthlyPlan = plans.find(plan => String(plan.ownerId) === ownerId) || null;
      return deriveOwnerSummary({
        ownerId,
        accounts,
        debts,
        monthlyPlan,
        today,
        cycleStart: cycle.startDate,
        cycleEnd: cycle.endDate
      });
    });

    res.json({
      success: true,
      data: {
        viewerId: String(req.userId),
        partnerId,
        month,
        today,
        cycle,
        identities,
        accounts: accounts.map(serializeAccount),
        debts: debts.map(serializeDebt),
        monthlyPlans: plans.map(serializeMonthlyPlan),
        summaries,
        timeline: buildTimeline(debts, plans),
        relationshipUpdatedAt: user.lastUpdate || null
      }
    });
  } catch (error) {
    respondError(res, error, '[Wallet] 获取钱包总览失败');
  }
});

router.post('/debts', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    const name = String(req.body.name || '').trim();
    const amount = roundMoney(req.body.amount);
    const feeAmount = roundMoney(req.body.feeAmount || 0);
    const installmentCount = Number(req.body.installmentCount);
    const firstDueDate = String(req.body.firstDueDate || '');
    const provider = PROVIDERS.has(req.body.provider) ? req.body.provider : 'other';
    const requestId = normalizeDebtCreationRequestId(req.body.requestId);
    if (!name || !(amount > 0) || feeAmount < 0 || !isLocalDate(firstDueDate)
      || !Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120) {
      throw new WalletMutationError('请完整填写欠款金额、首期日期和期数', 400, 'INVALID_DEBT');
    }
    const schedule = generateInstallments({ amount, feeAmount, count: installmentCount, firstDueDate });
    const total = roundMoney(amount + feeAmount);
    const input = {
      coupleId,
      ownerId: String(req.userId),
      liabilityAccountId: req.body.liabilityAccountId || '',
      name,
      provider,
      amount,
      feeAmount,
      total,
      firstDueDate,
      installmentCount,
      schedule,
      requestId
    };

    let result;
    try {
      result = await withWalletTransaction(session => createDebtWithTransaction(input, session));
    } catch (error) {
      if (error?.code !== 'TRANSACTION_UNAVAILABLE' || mongoose.connection?.readyState !== 1) throw error;
      result = await createDebtWithoutTransaction(input);
    }

    if (!result.replay || result.completedNow) {
      emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.liabilityAccount), req.userId, requestId);
      emitSync(req.app, coupleId, 'walletSync', 'debtCreate', serializeDebt(result.debt), req.userId, requestId);
    }
    return res.status(result.replay && !result.completedNow ? 200 : 201).json({
      success: true,
      replay: result.replay,
      data: serializeDebt(result.debt)
    });
  } catch (error) {
    respondError(res, error, '[Wallet] 创建欠款计划失败');
  }
});

router.put('/debts/:id', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    if (!mongoose.isValidObjectId(req.params.id)) throw new WalletMutationError('欠款计划不存在', 404, 'DEBT_NOT_FOUND');
    const debt = await DebtPlan.findOne({ _id: req.params.id, coupleId });
    if (!debt) throw new WalletMutationError('欠款计划不存在', 404, 'DEBT_NOT_FOUND');
    if (String(debt.ownerId) !== String(req.userId)) throw new WalletMutationError('只能修改自己的欠款计划', 403, 'OWNER_ONLY');
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) throw new WalletMutationError('欠款名称不能为空', 400, 'INVALID_DEBT');
      debt.name = name;
    }
    if (req.body.provider !== undefined && PROVIDERS.has(req.body.provider)) debt.provider = req.body.provider;
    if (req.body.status === 'archived') debt.status = 'archived';
    await debt.save();
    emitSync(req.app, coupleId, 'walletSync', 'debtUpdate', serializeDebt(debt), req.userId);
    res.json({ success: true, data: serializeDebt(debt) });
  } catch (error) {
    respondError(res, error, '[Wallet] 更新欠款计划失败');
  }
});

router.put('/debts/:id/installments/:installmentId', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.installmentId)) {
      throw new WalletMutationError('分期计划不存在', 404, 'INSTALLMENT_NOT_FOUND');
    }
    const debt = await DebtPlan.findOne({ _id: req.params.id, coupleId });
    if (!debt) throw new WalletMutationError('欠款计划不存在', 404, 'DEBT_NOT_FOUND');
    if (String(debt.ownerId) !== String(req.userId)) throw new WalletMutationError('只能调整自己的分期', 403, 'OWNER_ONLY');
    const installment = debt.schedule.id(req.params.installmentId);
    if (!installment || installment.status === 'paid') {
      throw new WalletMutationError('已还清的分期不能调整', 409, 'INSTALLMENT_LOCKED');
    }
    if (req.body.dueDate !== undefined) {
      if (!isLocalDate(req.body.dueDate)) throw new WalletMutationError('请选择有效的还款日期', 400, 'INVALID_DATE');
      installment.dueDate = req.body.dueDate;
    }
    if (req.body.plannedAmount !== undefined) {
      const nextAmount = roundMoney(req.body.plannedAmount);
      try {
        rebalanceInstallmentAmount(debt.schedule, installment._id, nextAmount);
      } catch (error) {
        const tooLarge = error?.message === 'INSTALLMENT_AMOUNT_TOO_LARGE';
        const lastFixed = error?.message === 'LAST_INSTALLMENT_FIXED';
        throw new WalletMutationError(
          tooLarge ? '该期金额超过其他未还期次可调整的范围' : lastFixed ? '最后一期金额需要与剩余欠款保持一致' : '计划金额必须高于该期已还金额',
          400,
          'INVALID_AMOUNT'
        );
      }
    }
    await debt.save();
    emitSync(req.app, coupleId, 'walletSync', 'installmentUpdate', serializeDebt(debt), req.userId);
    res.json({ success: true, data: serializeDebt(debt) });
  } catch (error) {
    respondError(res, error, '[Wallet] 调整分期失败');
  }
});

router.put('/monthly-plan/:month', authMiddleware, async (req, res) => {
  try {
    const { coupleId } = await requireCouple(req);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.params.month)) {
      throw new WalletMutationError('月份格式不正确', 400, 'INVALID_MONTH');
    }
    const expectedIncome = req.body.expectedIncome || {};
    const incomeDate = String(expectedIncome.date || '');
    const incomeAmount = roundMoney(expectedIncome.amount || 0);
    if ((incomeDate && !isLocalDate(incomeDate)) || incomeAmount < 0) {
      throw new WalletMutationError('预计收入信息不正确', 400, 'INVALID_INCOME');
    }
    const cycle = paydayCycleForMonth(req.params.month);
    if (incomeDate && (incomeDate < cycle.startDate || incomeDate > cycle.endDate)) {
      throw new WalletMutationError('预计收入日期需在本资金周期内', 400, 'INCOME_OUTSIDE_CYCLE');
    }
    const plan = await MonthlyWalletPlan.findOneAndUpdate(
      { coupleId, ownerId: req.userId, month: req.params.month },
      {
        $set: {
          expectedIncome: {
            title: String(expectedIncome.title || '预计收入').trim().slice(0, 30),
            amount: incomeAmount,
            date: incomeDate
          },
          pockets: normalizePockets(req.body.pockets)
        },
        $setOnInsert: { coupleId, ownerId: req.userId, month: req.params.month }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    emitSync(req.app, coupleId, 'walletSync', 'monthlyPlanUpdate', serializeMonthlyPlan(plan), req.userId);
    res.json({ success: true, data: serializeMonthlyPlan(plan) });
  } catch (error) {
    respondError(res, error, '[Wallet] 保存月度计划失败');
  }
});

router.post('/debts/:id/payments', authMiddleware, async (req, res) => {
  let coupleId;
  let input;
  try {
    ({ coupleId } = await requireCouple(req));
    if (!mongoose.isValidObjectId(req.params.id)) throw new WalletMutationError('欠款计划不存在', 404, 'DEBT_NOT_FOUND');
    const amount = roundMoney(req.body.amount);
    const requestId = String(req.body.requestId || '').trim();
    if (!(amount > 0) || !requestId || requestId.length > 80) {
      throw new WalletMutationError('请输入还款金额并重新提交', 400, 'INVALID_PAYMENT');
    }
    if (!mongoose.isValidObjectId(req.body.assetAccountId)) {
      throw new WalletMutationError('请选择自己的付款账户', 400, 'INVALID_ASSET_ACCOUNT');
    }
    if (req.body.installmentId && !mongoose.isValidObjectId(req.body.installmentId)) {
      throw new WalletMutationError('分期不存在', 404, 'INSTALLMENT_NOT_FOUND');
    }
    input = {
      coupleId,
      debtPlanId: String(req.params.id),
      payerId: String(req.userId),
      assetAccountId: String(req.body.assetAccountId),
      amount,
      requestId,
      installmentId: req.body.installmentId ? String(req.body.installmentId) : null,
      note: String(req.body.note || '').trim().slice(0, 200)
    };

    let result;
    try {
      result = await withWalletTransaction(session => createPaymentWithTransaction(input, session));
    } catch (error) {
      const recoveryRequired = error?.code === 'PAYMENT_RECOVERY_REQUIRED';
      const topologyFallback = error?.code === 'TRANSACTION_UNAVAILABLE'
        && mongoose.connection?.readyState === 1;
      if (!recoveryRequired && !topologyFallback) throw error;
      result = await createPaymentWithoutTransaction(input);
    }

    if (result.replay && !result.completedNow) {
      return res.json({ success: true, replay: true, data: serializePayment(result.payment) });
    }
    emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.updatedAsset), req.userId, requestId);
    emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.updatedLiability), req.userId, requestId);
    emitSync(req.app, coupleId, 'walletSync', 'debtPayment', {
      payment: serializePayment(result.payment),
      debt: serializeDebt(result.debt)
    }, req.userId, requestId);
    return res.status(201).json({ success: true, replay: Boolean(result.replay), data: serializePayment(result.payment) });
  } catch (error) {
    if (error?.code === 11000 && input) {
      try {
        const replay = await findPayment(input);
        if (replay) {
          assertPaymentReplay(replay, input);
          if (replay.mutationStatus === 'ready') {
            return res.json({ success: true, replay: true, data: serializePayment(replay) });
          }
          return respondError(
            res,
            new WalletMutationError('这笔还款正在继续完成，请重试', 409, 'PAYMENT_RECOVERY_REQUIRED'),
            '[Wallet] 确认重复还款失败'
          );
        }
      } catch (replayError) {
        return respondError(res, replayError, '[Wallet] 确认重复还款失败');
      }
    }
    return respondError(res, error, '[Wallet] 债务还款失败');
  }
});

module.exports = router;
module.exports.WalletMutationError = WalletMutationError;
module.exports.withWalletTransaction = withWalletTransaction;
