// ============================================
// 情侣账本路由：资产、记账、预算、出行统计
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const { Asset, Transaction, BudgetSettings } = require('../models/Budget');

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

function getCoupleId(userId, partnerId) {
  return [userId, partnerId].sort().join('_');
}

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0);
  return { start, end };
}

// ==================== 资产账户 ====================

router.get('/assets', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: [] });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const assets = await Asset.find({ coupleId }).sort({ createdAt: -1 });
    res.json({ success: true, data: assets });
  } catch (e) {
    console.error('[Budget] 获取资产失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/assets', authMiddleware, async (req, res) => {
  try {
    const { name, type, balance } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '请输入账户名称' });
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const asset = new Asset({ coupleId, name: name.trim(), type: type || 'cash', balance: Number(balance) || 0, creatorId: req.userId });
    await asset.save();
    emitBudgetSync(req.app, coupleId, { action: 'assetCreate', payload: asset, actor: req.userId });
    res.json({ success: true, data: asset });
  } catch (e) {
    console.error('[Budget] 创建资产失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/assets/:id', authMiddleware, async (req, res) => {
  try {
    const { name, type, balance } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: '账户不存在' });
    const user = await User.findById(req.userId);
    if (asset.coupleId !== getCoupleId(req.userId, user?.partnerId)) return res.status(403).json({ success: false, message: '无权操作' });
    if (name !== undefined) asset.name = name.trim();
    if (type !== undefined) asset.type = type;
    if (balance !== undefined) asset.balance = Number(balance) || 0;
    asset.updatedAt = new Date();
    await asset.save();
    emitBudgetSync(req.app, asset.coupleId, { action: 'assetUpdate', payload: asset, actor: req.userId });
    res.json({ success: true, data: asset });
  } catch (e) {
    console.error('[Budget] 更新资产失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/assets/:id', authMiddleware, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: '账户不存在' });
    const user = await User.findById(req.userId);
    if (asset.coupleId !== getCoupleId(req.userId, user?.partnerId)) return res.status(403).json({ success: false, message: '无权操作' });
    await Asset.deleteOne({ _id: req.params.id });
    emitBudgetSync(req.app, asset.coupleId, { action: 'assetDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    console.error('[Budget] 删除资产失败:', e);
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
    const transactions = await Transaction.find(query).sort({ date: -1 }).limit(200);
    res.json({ success: true, data: transactions });
  } catch (e) {
    console.error('[Budget] 获取交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, amount, category, accountId, date, note } = req.body;
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const txn = new Transaction({
      coupleId, type, amount: Number(amount), category,
      accountId: accountId || null,
      date: new Date(date),
      note: note?.trim() || '',
      creatorId: req.userId
    });
    await txn.save();
    // 更新资产余额
    if (accountId) {
      const asset = await Asset.findById(accountId);
      if (asset && asset.coupleId === coupleId) {
        if (type === 'expense') asset.balance -= Number(amount);
        else asset.balance += Number(amount);
        asset.balance = Math.max(0, asset.balance);
        await asset.save();
      }
    }
    emitBudgetSync(req.app, coupleId, { action: 'transactionCreate', payload: txn, actor: req.userId });
    res.json({ success: true, data: txn });
  } catch (e) {
    console.error('[Budget] 创建交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: '记录不存在' });
    const user = await User.findById(req.userId);
    if (txn.coupleId !== getCoupleId(req.userId, user?.partnerId)) return res.status(403).json({ success: false, message: '无权操作' });

    const oldAmount = txn.amount;
    const oldType = txn.type;
    const oldAccountId = txn.accountId ? txn.accountId.toString() : null;

    const { type, amount, category, accountId, date, note } = req.body;
    if (type !== undefined) txn.type = type;
    if (amount !== undefined) txn.amount = Number(amount);
    if (category !== undefined) txn.category = category;
    if (accountId !== undefined) txn.accountId = accountId || null;
    if (date !== undefined) txn.date = new Date(date);
    if (note !== undefined) txn.note = note.trim();

    await txn.save();

    // 调整资产余额
    const revertAsset = async (aid, t, amt) => {
      if (!aid) return;
      const asset = await Asset.findById(aid);
      if (asset && asset.coupleId === txn.coupleId) {
        if (t === 'expense') asset.balance += amt;
        else asset.balance -= amt;
        asset.balance = Math.max(0, asset.balance);
        await asset.save();
      }
    };
    const applyAsset = async (aid, t, amt) => {
      if (!aid) return;
      const asset = await Asset.findById(aid);
      if (asset && asset.coupleId === txn.coupleId) {
        if (t === 'expense') asset.balance -= amt;
        else asset.balance += amt;
        asset.balance = Math.max(0, asset.balance);
        await asset.save();
      }
    };

    if (oldAccountId && oldAccountId === (txn.accountId?.toString?.() || txn.accountId)) {
      await revertAsset(oldAccountId, oldType, oldAmount);
      await applyAsset(txn.accountId.toString(), txn.type, txn.amount);
    } else {
      if (oldAccountId) await revertAsset(oldAccountId, oldType, oldAmount);
      if (txn.accountId) await applyAsset(txn.accountId.toString(), txn.type, txn.amount);
    }

    emitBudgetSync(req.app, txn.coupleId, { action: 'transactionUpdate', payload: txn, actor: req.userId });
    res.json({ success: true, data: txn });
  } catch (e) {
    console.error('[Budget] 更新交易失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: '记录不存在' });
    const user = await User.findById(req.userId);
    if (txn.coupleId !== getCoupleId(req.userId, user?.partnerId)) return res.status(403).json({ success: false, message: '无权操作' });

    if (txn.accountId) {
      const asset = await Asset.findById(txn.accountId);
      if (asset && asset.coupleId === txn.coupleId) {
        if (txn.type === 'expense') asset.balance += txn.amount;
        else asset.balance -= txn.amount;
        asset.balance = Math.max(0, asset.balance);
        await asset.save();
      }
    }

    await Transaction.deleteOne({ _id: req.params.id });
    emitBudgetSync(req.app, txn.coupleId, { action: 'transactionDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    console.error('[Budget] 删除交易失败:', e);
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
    console.error('[Budget] 获取设置失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { monthlyBudget, categoryBudgets, travelQuota } = req.body;
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    let settings = await BudgetSettings.findOne({ coupleId });
    if (!settings) {
      settings = new BudgetSettings({ coupleId });
    }
    if (monthlyBudget !== undefined) settings.monthlyBudget = Number(monthlyBudget);
    if (categoryBudgets !== undefined) {
      const obj = settings.categoryBudgets || {};
      for (const [k, v] of Object.entries(categoryBudgets)) {
        obj[k] = Number(v);
      }
      settings.categoryBudgets = obj;
    }
    if (travelQuota !== undefined) {
      settings.travelQuota = { ...settings.travelQuota, ...travelQuota };
    }
    settings.updatedAt = new Date();
    await settings.save();
    emitBudgetSync(req.app, coupleId, { action: 'settingsUpdate', payload: settings, actor: req.userId });
    res.json({ success: true, data: settings });
  } catch (e) {
    console.error('[Budget] 更新设置失败:', e);
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

    const settings = await BudgetSettings.findOne({ coupleId }) || new BudgetSettings({ coupleId });

    // 本月收支
    const monthTxns = await Transaction.find({ coupleId, date: { $gte: start, $lt: end } });
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // 分类统计
    const categoryStats = {};
    const categories = ['dining', 'transport', 'shopping', 'entertainment', 'study', 'living', 'medical', 'gift', 'travel', 'other'];
    categories.forEach(c => { categoryStats[c] = { expense: 0, budget: settings.categoryBudgets?.get?.(c) || settings.categoryBudgets?.[c] || 0 }; });
    monthTxns.filter(t => t.type === 'expense').forEach(t => {
      if (categoryStats[t.category]) categoryStats[t.category].expense += t.amount;
    });

    // 出行统计
    const travelPeriodStart = settings.travelQuota?.period === 'weekly'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      : start;
    const travelCount = await Transaction.countDocuments({
      coupleId,
      category: 'travel',
      type: 'expense',
      date: { $gte: travelPeriodStart, $lt: end }
    });

    // 总资产
    const assets = await Asset.find({ coupleId });
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);

    res.json({
      success: true,
      data: {
        expense,
        income,
        balance: income - expense,
        monthlyBudget: settings.monthlyBudget,
        remainingBudget: Math.max(0, settings.monthlyBudget - expense),
        categoryStats,
        travel: {
          used: travelCount,
          limit: settings.travelQuota?.limit || 0,
          period: settings.travelQuota?.period || 'monthly'
        },
        totalAssets,
        assetCount: assets.length
      }
    });
  } catch (e) {
    console.error('[Budget] 获取统计失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
