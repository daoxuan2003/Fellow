const express = require('express');
const mongoose = require('mongoose');

const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const Account = require('../models/Account');
const { Transaction } = require('../models/Budget');
const { DebtPlan, MonthlyWalletPlan, DebtPayment } = require('../models/Wallet');
const { logError } = require('../utils/safeLogger');
const {
  allocatePayment,
  deriveOwnerSummary,
  generateInstallments,
  isLocalDate,
  localDateToDate,
  normalizePockets,
  rebalanceInstallmentAmount,
  roundMoney
} = require('../utils/walletPlanner');

const router = express.Router();
const PROVIDERS = new Set(['huabei', 'baitiao', 'credit_card', 'loan', 'other']);

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

function addLocalDays(localDate, days) {
  const [year, month, day] = localDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  return target.toISOString().slice(0, 10);
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
  return [...debtItems, ...incomeItems].sort((a, b) => a.date.localeCompare(b.date));
}

function nextCutoff(today, plan) {
  const thirtyDays = addLocalDays(today, 30);
  const incomeDate = plan?.expectedIncome?.date;
  return incomeDate && incomeDate >= today && incomeDate < thirtyDays ? incomeDate : thirtyDays;
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

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { user, partnerId, coupleId } = await requireCouple(req);
    const today = localDateParts();
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? req.query.month : today.slice(0, 7);
    const [accounts, debts, plans, users] = await Promise.all([
      Account.find({ coupleId, isArchived: false }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
      DebtPlan.find({ coupleId, status: { $ne: 'archived' } }).sort({ createdAt: -1 }).lean(),
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
        cutoffDate: nextCutoff(today, monthlyPlan)
      });
    });

    res.json({
      success: true,
      data: {
        viewerId: String(req.userId),
        partnerId,
        month,
        today,
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
    if (!name || !(amount > 0) || feeAmount < 0 || !isLocalDate(firstDueDate)
      || !Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120) {
      throw new WalletMutationError('请完整填写欠款金额、首期日期和期数', 400, 'INVALID_DEBT');
    }
    const schedule = generateInstallments({ amount, feeAmount, count: installmentCount, firstDueDate });
    const total = roundMoney(amount + feeAmount);

    const result = await withWalletTransaction(async session => {
      let liabilityAccount;
      if (req.body.liabilityAccountId) {
        liabilityAccount = await Account.findOne({
          _id: req.body.liabilityAccountId,
          coupleId,
          userId: req.userId,
          type: 'liability',
          isArchived: false
        }, null, sessionOptions(session));
        if (!liabilityAccount) throw new WalletMutationError('请选择自己的负债账户', 400, 'INVALID_LIABILITY_ACCOUNT');
        const existingPlan = await DebtPlan.findOne({
          coupleId,
          liabilityAccountId: liabilityAccount._id,
          status: 'active'
        }, null, sessionOptions(session));
        if (existingPlan) throw new WalletMutationError('该账户已有进行中的还款计划', 409, 'ACCOUNT_ALREADY_LINKED');
        liabilityAccount.balance = total;
        liabilityAccount.updatedAt = new Date();
        await liabilityAccount.save(sessionOptions(session));
      } else {
        liabilityAccount = new Account({
          coupleId,
          userId: req.userId,
          name,
          type: 'liability',
          subType: provider === 'other' ? 'other_liability' : provider,
          currency: 'CNY',
          balance: total,
          icon: '欠',
          color: '#FF7FA5'
        });
        await liabilityAccount.save(sessionOptions(session));
      }

      const debt = new DebtPlan({
        coupleId,
        ownerId: req.userId,
        liabilityAccountId: liabilityAccount._id,
        name,
        provider,
        originalAmount: amount,
        feeAmount,
        outstandingAmount: total,
        firstDueDate,
        installmentCount,
        schedule
      });
      await debt.save(sessionOptions(session));
      return { debt, liabilityAccount };
    });

    emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.liabilityAccount), req.userId);
    emitSync(req.app, coupleId, 'walletSync', 'debtCreate', serializeDebt(result.debt), req.userId);
    res.status(201).json({ success: true, data: serializeDebt(result.debt) });
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
    if (!/^\d{4}-\d{2}$/.test(req.params.month)) {
      throw new WalletMutationError('月份格式不正确', 400, 'INVALID_MONTH');
    }
    const expectedIncome = req.body.expectedIncome || {};
    const incomeDate = String(expectedIncome.date || '');
    const incomeAmount = roundMoney(expectedIncome.amount || 0);
    if ((incomeDate && !isLocalDate(incomeDate)) || incomeAmount < 0) {
      throw new WalletMutationError('预计收入信息不正确', 400, 'INVALID_INCOME');
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

    const result = await withWalletTransaction(async session => {
      const replay = await DebtPayment.findOne({ coupleId, requestId }, null, sessionOptions(session));
      if (replay) return { replay: true, payment: replay };

      const debt = await DebtPlan.findOne({ _id: req.params.id, coupleId, status: 'active' }, null, sessionOptions(session));
      if (!debt) throw new WalletMutationError('欠款计划不存在或已还清', 404, 'DEBT_NOT_FOUND');
      if (amount > Number(debt.outstandingAmount)) {
        throw new WalletMutationError('还款金额不能超过剩余欠款', 400, 'PAYMENT_TOO_LARGE');
      }
      const assetAccount = await Account.findOne({
        _id: req.body.assetAccountId,
        coupleId,
        userId: req.userId,
        type: 'asset',
        isArchived: false
      }, null, sessionOptions(session));
      if (!assetAccount) throw new WalletMutationError('只能使用自己的资产账户还款', 403, 'PAYER_ACCOUNT_ONLY');
      if (Number(assetAccount.balance) < amount) {
        throw new WalletMutationError('付款账户余额不足', 409, 'INSUFFICIENT_FUNDS');
      }
      const liabilityAccount = await Account.findOne({
        _id: debt.liabilityAccountId,
        coupleId,
        userId: debt.ownerId,
        type: 'liability',
        isArchived: false
      }, null, sessionOptions(session));
      if (!liabilityAccount) throw new WalletMutationError('关联负债账户不存在', 409, 'LIABILITY_ACCOUNT_MISSING');
      if (Number(liabilityAccount.balance) < amount) {
        throw new WalletMutationError('还款金额超过账户负债余额，请先校准账户', 409, 'LIABILITY_BALANCE_MISMATCH');
      }

      const paidAt = new Date();
      let allocations;
      try {
        allocations = allocatePayment(debt.schedule, amount, req.body.installmentId || null, {
          paidAt,
          paidBy: String(req.userId),
          paymentReference: requestId
        });
      } catch (error) {
        throw new WalletMutationError('还款金额超出所选期次后的待还计划，请刷新后重试', 409, 'SCHEDULE_MISMATCH');
      }
      const updatedAsset = await Account.findOneAndUpdate(
        { _id: assetAccount._id, coupleId, userId: req.userId, type: 'asset', balance: { $gte: amount } },
        { $inc: { balance: -amount }, $set: { updatedAt: paidAt } },
        sessionOptions(session, { new: true, runValidators: true })
      );
      if (!updatedAsset) throw new WalletMutationError('付款账户余额已变化，请刷新后重试', 409, 'STALE_ASSET_BALANCE');
      const updatedLiability = await Account.findOneAndUpdate(
        { _id: liabilityAccount._id, coupleId, userId: debt.ownerId, type: 'liability', balance: { $gte: amount } },
        { $inc: { balance: -amount }, $set: { updatedAt: paidAt } },
        sessionOptions(session, { new: true, runValidators: true })
      );
      if (!updatedLiability) throw new WalletMutationError('负债余额已变化，请刷新后重试', 409, 'STALE_LIABILITY_BALANCE');

      debt.outstandingAmount = roundMoney(Number(debt.outstandingAmount) - amount);
      if (debt.outstandingAmount === 0) debt.status = 'paid';
      await debt.save(sessionOptions(session));

      const transaction = new Transaction({
        coupleId,
        type: 'transfer',
        kind: 'debt_payment',
        amount,
        currency: 'CNY',
        category: '债务还款',
        accountId: assetAccount._id,
        toAccountId: liabilityAccount._id,
        debtPlanId: debt._id,
        installmentId: allocations[0]?.installmentId || null,
        requestId,
        date: localDateToDate(localDateParts(paidAt)),
        note: String(req.body.note || '').trim().slice(0, 200),
        creatorId: req.userId
      });
      await transaction.save(sessionOptions(session));

      const payment = new DebtPayment({
        coupleId,
        debtPlanId: debt._id,
        payerId: req.userId,
        debtOwnerId: debt.ownerId,
        assetAccountId: assetAccount._id,
        liabilityAccountId: liabilityAccount._id,
        amount,
        requestId,
        transactionId: transaction._id,
        allocations
      });
      await payment.save(sessionOptions(session));
      return { replay: false, payment, debt, updatedAsset, updatedLiability, transaction };
    });

    if (result.replay) {
      return res.json({ success: true, replay: true, data: serializePayment(result.payment) });
    }
    emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.updatedAsset), req.userId, requestId);
    emitSync(req.app, coupleId, 'accountSync', 'accountUpdate', serializeAccount(result.updatedLiability), req.userId, requestId);
    emitSync(req.app, coupleId, 'budgetSync', 'transactionCreate', result.transaction, req.userId, requestId);
    emitSync(req.app, coupleId, 'walletSync', 'debtPayment', {
      payment: serializePayment(result.payment),
      debt: serializeDebt(result.debt)
    }, req.userId, requestId);
    return res.status(201).json({ success: true, replay: false, data: serializePayment(result.payment) });
  } catch (error) {
    if (error?.code === 11000 && coupleId) {
      const requestId = String(req.body.requestId || '').trim();
      const replay = await DebtPayment.findOne({ coupleId, requestId });
      if (replay) return res.json({ success: true, replay: true, data: serializePayment(replay) });
    }
    return respondError(res, error, '[Wallet] 债务还款失败');
  }
});

module.exports = router;
module.exports.WalletMutationError = WalletMutationError;
module.exports.withWalletTransaction = withWalletTransaction;
