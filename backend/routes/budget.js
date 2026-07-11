// ============================================
// 情侣账本路由 v2：自定义分类 + 净资产快照 + 通用额度
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const { Category, Transaction, NetWorth, BudgetSettings } = require('../models/Budget');
const Account = require('../models/Account');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

function emitBudgetSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'budgetSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function emitAccountSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'accountSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function getCoupleId(userId, partnerId) {
  return [userId, partnerId].sort().join('_');
}

function getAccountId(value) {
  return value ? value.toString() : null;
}

async function findCoupleAccount(accountId, coupleId) {
  if (!accountId) return null;
  if (!mongoose.isValidObjectId(accountId)) return null;
  return Account.findOne({ _id: accountId, coupleId });
}

async function findOwnedCoupleAccount(accountId, coupleId, userId) {
  if (!accountId) return null;
  if (!mongoose.isValidObjectId(accountId)) return null;
  return Account.findOne({ _id: accountId, coupleId, userId });
}

async function validateTransactionAccounts({ type, accountId, toAccountId, coupleId, userId }) {
  if (!['expense', 'income', 'transfer'].includes(type)) {
    return '交易类型不正确';
  }

  if (type === 'transfer') {
    if (!accountId || !toAccountId) return '请选择转出和转入账户';
    if (String(accountId) === String(toAccountId)) return '不能转入同一账户';

    const [fromAccount, toAccount] = await Promise.all([
      findOwnedCoupleAccount(accountId, coupleId, userId),
      findOwnedCoupleAccount(toAccountId, coupleId, userId)
    ]);

    if (!fromAccount || !toAccount) {
      return '请选择自己的转出和转入账户';
    }
    return null;
  }

  if (accountId) {
    const account = await findOwnedCoupleAccount(accountId, coupleId, userId);
    if (!account) return '请选择自己的账户';
  }

  return null;
}

async function adjustCoupleAccountBalance(accountId, coupleId, delta) {
  const account = await findCoupleAccount(accountId, coupleId);
  if (!account) return null;
  account.balance = Number((Number(account.balance || 0) + delta).toFixed(2));
  account.updatedAt = new Date();
  await account.save();
  return account;
}

function trackTouchedAccount(touchedAccounts, account) {
  if (!account?._id) return;
  touchedAccounts.set(account._id.toString(), account);
}

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0);
  return { start, end };
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function getYearRange(year) {
  const start = new Date(year, 0, 1, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0);
  return { start, end };
}

function getPeriodRange(period, now = new Date()) {
  if (period === 'weekly') return getWeekRange(now);
  if (period === 'yearly') return getYearRange(now.getFullYear());
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

// ==================== 自定义分类 ====================

router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: [] });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const categories = await Category.find({ coupleId }).sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (e) {
    logError('[Budget] 获取分类失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, emoji, budget, quota, quotaType, period } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '请输入分类名称' });
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const category = new Category({
      coupleId, name: name.trim(), emoji: emoji || '📦',
      budget: Number(budget) || 0, quota: Number(quota) || 0,
      quotaType: quotaType || 'count', period: period || 'monthly',
      creatorId: req.userId
    });
    await category.save();
    emitBudgetSync(req.app, coupleId, { action: 'categoryCreate', payload: category, actor: req.userId });
    res.json({ success: true, data: category });
  } catch (e) {
    logError('[Budget] 创建分类失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { name, emoji, budget, quota, quotaType, period } = req.body;
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const category = await Category.findOne({ _id: req.params.id, coupleId });
    if (!category) return res.status(404).json({ success: false, message: '分类不存在' });
    if (name !== undefined) category.name = name.trim();
    if (emoji !== undefined) category.emoji = emoji;
    if (budget !== undefined) category.budget = Number(budget) || 0;
    if (quota !== undefined) category.quota = Number(quota) || 0;
    if (quotaType !== undefined) category.quotaType = quotaType;
    if (period !== undefined) category.period = period;
    await category.save();
    emitBudgetSync(req.app, category.coupleId, { action: 'categoryUpdate', payload: category, actor: req.userId });
    res.json({ success: true, data: category });
  } catch (e) {
    logError('[Budget] 更新分类失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const category = await Category.findOne({ _id: req.params.id, coupleId });
    if (!category) return res.status(404).json({ success: false, message: '分类不存在' });
    const deleteResult = await Category.deleteOne({ _id: req.params.id, coupleId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    emitBudgetSync(req.app, category.coupleId, { action: 'categoryDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    logError('[Budget] 删除分类失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 记账 ====================

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: [] });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const query = { coupleId };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lt: new Date(endDate) };
    }
    if (category) query.category = category;
    if (type) query.type = type;
    const transactions = await Transaction.find(query).sort({ date: -1 }).limit(300);
    res.json({ success: true, data: transactions });
  } catch (e) {
    logError('[Budget] 获取交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, amount, currency, category, accountId, toAccountId, date, note } = req.body;
    if (!type || !amount || !date) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    if (type !== 'transfer' && !category) {
      return res.status(400).json({ success: false, message: '请选择分类' });
    }
    if (type === 'transfer' && (!accountId || !toAccountId)) {
      return res.status(400).json({ success: false, message: '请选择转出和转入账户' });
    }
    if (type === 'transfer' && accountId === toAccountId) {
      return res.status(400).json({ success: false, message: '不能转入同一账户' });
    }
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const accountError = await validateTransactionAccounts({ type, accountId, toAccountId, coupleId, userId: req.userId });
    if (accountError) return res.status(400).json({ success: false, message: accountError });

    const txn = new Transaction({
      coupleId, type, amount: Number(amount), currency: (currency || 'CNY').toUpperCase(),
      category: category?.trim() || '', accountId: accountId || null, toAccountId: type === 'transfer' ? toAccountId || null : null,
      date: new Date(date), note: note?.trim() || '', creatorId: req.userId
    });
    await txn.save();

    const touchedAccounts = new Map();

    // 更新账户余额
    if (type === 'transfer') {
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(accountId, coupleId, -Number(amount)));
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(toAccountId, coupleId, Number(amount)));
    } else if (accountId) {
      const delta = type === 'income' ? Number(amount) : -Number(amount);
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(accountId, coupleId, delta));
    }

    for (const account of touchedAccounts.values()) {
      emitAccountSync(req.app, coupleId, { action: 'accountUpdate', payload: account, actor: req.userId });
    }
    emitBudgetSync(req.app, coupleId, { action: 'transactionCreate', payload: txn, actor: req.userId });
    res.json({ success: true, data: txn });
  } catch (e) {
    logError('[Budget] 创建交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const txn = await Transaction.findOne({ _id: req.params.id, coupleId });
    if (!txn) return res.status(404).json({ success: false, message: '记录不存在' });
    if (String(txn.creatorId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能修改自己创建的记录' });
    }
    const { type, amount, currency, category, accountId, toAccountId, date, note } = req.body;

    const oldAccountId = txn.accountId?.toString();
    const oldToAccountId = txn.toAccountId?.toString();
    const oldType = txn.type;
    const oldAmount = txn.amount;

    const nextType = type !== undefined ? type : txn.type;
    const nextAmount = amount !== undefined ? Number(amount) : txn.amount;
    const nextCategory = category !== undefined ? category.trim() : txn.category;
    const nextAccountId = accountId !== undefined ? (accountId || null) : oldAccountId;
    const nextToAccountId = nextType === 'transfer'
      ? (toAccountId !== undefined ? (toAccountId || null) : oldToAccountId)
      : null;
    if (nextType !== 'transfer' && !nextCategory) {
      return res.status(400).json({ success: false, message: '请选择分类' });
    }
    const accountError = await validateTransactionAccounts({
      type: nextType,
      accountId: nextAccountId,
      toAccountId: nextToAccountId,
      coupleId: txn.coupleId,
      userId: req.userId
    });
    if (accountError) return res.status(400).json({ success: false, message: accountError });

    if (type !== undefined) txn.type = nextType;
    if (amount !== undefined) txn.amount = nextAmount;
    if (currency !== undefined) txn.currency = currency.toUpperCase();
    if (category !== undefined) txn.category = nextCategory;
    if (accountId !== undefined) txn.accountId = nextAccountId;
    if (toAccountId !== undefined || type !== undefined) txn.toAccountId = nextToAccountId;
    if (date !== undefined) txn.date = new Date(date);
    if (note !== undefined) txn.note = note.trim();
    await txn.save();

    const newAccountId = getAccountId(txn.accountId);
    const newToAccountId = getAccountId(txn.toAccountId);
    const touchedAccounts = new Map();

    if (oldType === 'transfer') {
      // 回滚旧转账
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(oldAccountId, txn.coupleId, oldAmount));
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(oldToAccountId, txn.coupleId, -oldAmount));
    } else {
      // 回滚旧收支
      if (oldAccountId) {
        const oldDelta = oldType === 'income' ? -oldAmount : oldAmount;
        trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(oldAccountId, txn.coupleId, oldDelta));
      }
    }

    if (txn.type === 'transfer') {
      // 应用新转账
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(newAccountId, txn.coupleId, -txn.amount));
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(newToAccountId, txn.coupleId, txn.amount));
    } else if (newAccountId) {
      const delta = txn.type === 'income' ? txn.amount : -txn.amount;
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(newAccountId, txn.coupleId, delta));
    }

    for (const account of touchedAccounts.values()) {
      emitAccountSync(req.app, txn.coupleId, { action: 'accountUpdate', payload: account, actor: req.userId });
    }

    emitBudgetSync(req.app, txn.coupleId, { action: 'transactionUpdate', payload: txn, actor: req.userId });
    res.json({ success: true, data: txn });
  } catch (e) {
    logError('[Budget] 更新交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const txn = await Transaction.findOne({ _id: req.params.id, coupleId });
    if (!txn) return res.status(404).json({ success: false, message: '记录不存在' });
    if (String(txn.creatorId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能删除自己创建的记录' });
    }

    const deleteResult = await Transaction.deleteOne({ _id: req.params.id, coupleId: txn.coupleId, creatorId: req.userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const touchedAccounts = new Map();

    // 回滚账户余额
    if (txn.type === 'transfer') {
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(getAccountId(txn.accountId), txn.coupleId, txn.amount));
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(getAccountId(txn.toAccountId), txn.coupleId, -txn.amount));
    } else if (txn.accountId) {
      const delta = txn.type === 'income' ? -txn.amount : txn.amount;
      trackTouchedAccount(touchedAccounts, await adjustCoupleAccountBalance(getAccountId(txn.accountId), txn.coupleId, delta));
    }

    for (const account of touchedAccounts.values()) {
      emitAccountSync(req.app, txn.coupleId, { action: 'accountUpdate', payload: account, actor: req.userId });
    }
    emitBudgetSync(req.app, txn.coupleId, { action: 'transactionDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    logError('[Budget] 删除交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 净资产快照 ====================

router.get('/networth', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: [] });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const records = await NetWorth.find({ coupleId }).sort({ date: -1 }).limit(50);
    res.json({ success: true, data: records });
  } catch (e) {
    logError('[Budget] 获取净资产失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/networth/latest', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: {} });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const latest = await NetWorth.find({ coupleId }).sort({ date: -1 }).limit(2);
    const result = {};
    latest.forEach(r => { result[r.userId] = r; });
    res.json({ success: true, data: result });
  } catch (e) {
    logError('[Budget] 获取最新净资产失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/networth', authMiddleware, async (req, res) => {
  try {
    const { amount, date, note } = req.body;
    if (amount === undefined || amount === null) return res.status(400).json({ success: false, message: '请输入金额' });
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const record = new NetWorth({
      coupleId, userId: req.userId, amount: Number(amount),
      date: date ? new Date(date) : new Date(), note: note?.trim() || '',
      createdAt: new Date()
    });
    await record.save();
    emitBudgetSync(req.app, coupleId, { action: 'netWorthCreate', payload: record, actor: req.userId });
    res.json({ success: true, data: record });
  } catch (e) {
    logError('[Budget] 创建净资产快照失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/networth/:id', authMiddleware, async (req, res) => {
  try {
    const { amount, date, note } = req.body;
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const record = await NetWorth.findOne({ _id: req.params.id, coupleId });
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    if (String(record.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能修改自己的净资产快照' });
    }
    if (amount !== undefined) record.amount = Number(amount);
    if (date !== undefined) record.date = new Date(date);
    if (note !== undefined) record.note = note.trim();
    await record.save();
    emitBudgetSync(req.app, record.coupleId, { action: 'netWorthUpdate', payload: record, actor: req.userId });
    res.json({ success: true, data: record });
  } catch (e) {
    logError('[Budget] 更新净资产快照失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/networth/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const record = await NetWorth.findOne({ _id: req.params.id, coupleId });
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    if (String(record.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能删除自己的净资产快照' });
    }
    const deleteResult = await NetWorth.deleteOne({ _id: req.params.id, coupleId: record.coupleId, userId: req.userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    emitBudgetSync(req.app, record.coupleId, { action: 'netWorthDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    logError('[Budget] 删除净资产快照失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 预算设置 ====================

router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: null });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    let settings = await BudgetSettings.findOne({ coupleId });
    if (!settings) {
      settings = new BudgetSettings({ coupleId });
      await settings.save();
    }
    res.json({ success: true, data: settings });
  } catch (e) {
    logError('[Budget] 获取设置失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { monthlyBudget } = req.body;
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    let settings = await BudgetSettings.findOne({ coupleId });
    if (!settings) settings = new BudgetSettings({ coupleId });
    if (monthlyBudget !== undefined) settings.monthlyBudget = Number(monthlyBudget);
    settings.updatedAt = new Date();
    await settings.save();
    emitBudgetSync(req.app, coupleId, { action: 'settingsUpdate', payload: settings, actor: req.userId });
    res.json({ success: true, data: settings });
  } catch (e) {
    logError('[Budget] 更新设置失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 统计 ====================

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const { start, end } = getMonthRange(year, month);
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: null });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const partnerId = user.partnerId;

    const settings = await BudgetSettings.findOne({ coupleId }) || new BudgetSettings({ coupleId });
    const categories = await Category.find({ coupleId });

    // 本月收支
    const monthTxns = await Transaction.find({ coupleId, date: { $gte: start, $lt: end } });
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // 分类统计 + 额度检查
    const categoryStats = {};
    categories.forEach(c => {
      categoryStats[c.name] = {
        name: c.name, emoji: c.emoji, budget: c.budget, quota: c.quota,
        quotaType: c.quotaType, period: c.period, expense: 0, count: 0
      };
    });
    monthTxns.filter(t => t.type === 'expense').forEach(t => {
      const cs = categoryStats[t.category];
      if (cs) { cs.expense += t.amount; cs.count += 1; }
    });

    // 通用额度使用情况（按各自周期计算）
    const quotaUsage = {};
    for (const c of categories) {
      if (c.quota <= 0) continue;
      const periodRange = getPeriodRange(c.period, now);
      const count = await Transaction.countDocuments({
        coupleId, category: c.name, type: 'expense',
        date: { $gte: periodRange.start, $lt: periodRange.end }
      });
      const amount = await Transaction.aggregate([
        { $match: { coupleId, category: c.name, type: 'expense', date: { $gte: periodRange.start, $lt: periodRange.end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const usedAmount = amount[0]?.total || 0;
      quotaUsage[c.name] = {
        used: c.quotaType === 'count' ? count : usedAmount,
        limit: c.quota,
        period: c.period,
        quotaType: c.quotaType,
        name: c.name, emoji: c.emoji
      };
    }

    // 最新净资产（确保双方都有数据，默认0）
    const latestNetWorth = await NetWorth.find({ coupleId }).sort({ date: -1 }).limit(10);
    const netWorthMap = {};
    // 先初始化双方为0
    netWorthMap[req.userId] = { userId: req.userId, amount: 0, date: null };
    netWorthMap[partnerId] = { userId: partnerId, amount: 0, date: null };
    // 用最新记录覆盖
    const seen = new Set();
    latestNetWorth.forEach(r => {
      if (!seen.has(r.userId)) {
        seen.add(r.userId);
        netWorthMap[r.userId] = { userId: r.userId, amount: r.amount, date: r.date, note: r.note };
      }
    });
    const totalNetWorth = Object.values(netWorthMap).reduce((s, r) => s + r.amount, 0);

    res.json({
      success: true,
      data: {
        expense, income,
        balance: income - expense,
        monthlyBudget: settings.monthlyBudget,
        remainingBudget: settings.monthlyBudget > 0 ? Math.max(0, settings.monthlyBudget - expense) : null,
        categoryStats,
        quotaUsage,
        totalNetWorth,
        netWorthMap
      }
    });
  } catch (e) {
    logError('[Budget] 获取统计失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
