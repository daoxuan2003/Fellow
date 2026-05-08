// ============================================
// 资产账户路由：多币种账户管理 + 资产汇总
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const Account = require('../models/Account');
const { fetchLatestRates, convertMultiple } = require('../services/exchangeRate');

const router = express.Router();

function getCoupleId(userId, partnerId) {
  return [userId, partnerId].sort().join('_');
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

// ==================== 账户 CRUD ====================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.json({ success: true, data: [] });
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const accounts = await Account.find({ coupleId, isArchived: false }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (e) {
    console.error('[Account] 获取账户失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, type, subType, currency, balance, icon, color, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '请输入账户名称' });
    if (!type || !['asset', 'liability'].includes(type)) {
      return res.status(400).json({ success: false, message: '请选择账户类型' });
    }
    const user = await User.findById(req.userId);
    if (!user?.partnerId) return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    const coupleId = getCoupleId(req.userId, user.partnerId);

    const account = new Account({
      coupleId,
      userId: req.userId,
      name: name.trim(),
      type,
      subType: subType || (type === 'asset' ? 'other_asset' : 'other_liability'),
      currency: (currency || 'CNY').toUpperCase(),
      balance: Number(balance) || 0,
      icon: icon || '💰',
      color: color || (type === 'asset' ? '#6366f1' : '#f43f5e'),
      sortOrder: Number(sortOrder) || 0
    });
    await account.save();
    emitAccountSync(req.app, coupleId, { action: 'accountCreate', payload: account, actor: req.userId });
    res.json({ success: true, data: account });
  } catch (e) {
    console.error('[Account] 创建账户失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: '账户不存在' });
    const user = await User.findById(req.userId);
    if (account.coupleId !== getCoupleId(req.userId, user?.partnerId)) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }

    const { name, type, subType, currency, balance, icon, color, sortOrder, isArchived } = req.body;
    if (name !== undefined) account.name = name.trim();
    if (type !== undefined) account.type = type;
    if (subType !== undefined) account.subType = subType;
    if (currency !== undefined) account.currency = currency.toUpperCase();
    if (balance !== undefined) account.balance = Number(balance);
    if (icon !== undefined) account.icon = icon;
    if (color !== undefined) account.color = color;
    if (sortOrder !== undefined) account.sortOrder = Number(sortOrder);
    if (isArchived !== undefined) account.isArchived = isArchived;
    account.updatedAt = new Date();
    await account.save();

    emitAccountSync(req.app, account.coupleId, { action: 'accountUpdate', payload: account, actor: req.userId });
    res.json({ success: true, data: account });
  } catch (e) {
    console.error('[Account] 更新账户失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: '账户不存在' });
    const user = await User.findById(req.userId);
    if (account.coupleId !== getCoupleId(req.userId, user?.partnerId)) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    await Account.deleteOne({ _id: req.params.id });
    emitAccountSync(req.app, account.coupleId, { action: 'accountDelete', payload: { id: req.params.id }, actor: req.userId });
    res.json({ success: true });
  } catch (e) {
    console.error('[Account] 删除账户失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 资产汇总 ====================

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.partnerId) {
      return res.json({ success: true, data: { totalAsset: 0, totalLiability: 0, netWorth: 0, byCurrency: [], details: [] } });
    }
    const coupleId = getCoupleId(req.userId, user.partnerId);
    const baseCurrency = (req.query.baseCurrency || 'CNY').toUpperCase();
    const accounts = await Account.find({ coupleId, isArchived: false }).lean();

    // 按人分组
    const userIds = [...new Set(accounts.map(a => a.userId))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.nickname || '我'; });

    // 资产
    const assetItems = accounts.filter(a => a.type === 'asset').map(a => ({ amount: a.balance, currency: a.currency }));
    const liabilityItems = accounts.filter(a => a.type === 'liability').map(a => ({ amount: a.balance, currency: a.currency }));

    const [assetConverted, liabilityConverted] = await Promise.all([
      convertMultiple(assetItems, baseCurrency),
      convertMultiple(liabilityItems, baseCurrency)
    ]);

    const totalAsset = assetConverted.total;
    const totalLiability = liabilityConverted.total;
    const netWorth = Number((totalAsset - totalLiability).toFixed(2));

    // 按币种原始金额汇总
    const currencyMap = {};
    accounts.forEach(a => {
      if (!currencyMap[a.currency]) currencyMap[a.currency] = { currency: a.currency, asset: 0, liability: 0 };
      if (a.type === 'asset') currencyMap[a.currency].asset += a.balance;
      else currencyMap[a.currency].liability += a.balance;
    });
    const byCurrency = Object.values(currencyMap).map(c => ({
      ...c,
      asset: Number(c.asset.toFixed(2)),
      liability: Number(c.liability.toFixed(2)),
      net: Number((c.asset - c.liability).toFixed(2))
    }));

    // 详细账户列表（附带换算后金额）
    const rateData = await fetchLatestRates(baseCurrency);
    const rates = rateData.rates;
    const details = accounts.map(a => {
      const converted = a.currency === baseCurrency
        ? a.balance
        : (rates[a.currency] ? Number((a.balance / rates[a.currency]).toFixed(2)) : null);
      return {
        ...a,
        userName: userMap[a.userId] || '未知',
        converted,
        convertedCurrency: baseCurrency
      };
    });

    // 按人分组汇总
    const byUser = {};
    userIds.forEach(uid => {
      byUser[uid] = {
        userId: uid,
        userName: userMap[uid] || '未知',
        totalAsset: 0,
        totalLiability: 0,
        netWorth: 0,
        assetAccounts: [],
        liabilityAccounts: []
      };
    });
    details.forEach(a => {
      const u = byUser[a.userId];
      if (!u) return;
      if (a.type === 'asset') {
        u.totalAsset += (a.converted !== null ? a.converted : a.balance);
        u.assetAccounts.push(a);
      } else {
        u.totalLiability += (a.converted !== null ? a.converted : a.balance);
        u.liabilityAccounts.push(a);
      }
    });
    Object.values(byUser).forEach(u => {
      u.totalAsset = Number(u.totalAsset.toFixed(2));
      u.totalLiability = Number(u.totalLiability.toFixed(2));
      u.netWorth = Number((u.totalAsset - u.totalLiability).toFixed(2));
    });

    res.json({
      success: true,
      data: {
        totalAsset,
        totalLiability,
        netWorth,
        baseCurrency,
        rateDate: rateData.date,
        byCurrency,
        byUser,
        details
      }
    });
  } catch (e) {
    console.error('[Account] 获取汇总失败:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
