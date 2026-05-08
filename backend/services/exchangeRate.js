// ============================================
// 汇率服务：从外部 API 获取并缓存汇率
// 使用 exchangerate-api.com 免费接口
// ============================================

const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

const API_BASE = 'https://api.exchangerate-api.com/v4/latest';

/**
 * 获取指定基础货币的最新汇率
 * 先查缓存（当天），没有则请求外部 API
 */
async function fetchLatestRates(base = 'CNY') {
  const today = new Date().toISOString().split('T')[0];

  // 检查今天是否已有缓存
  const cached = await ExchangeRate.findOne({ base, target: 'USD', date: today }).lean();
  if (cached) {
    const allCached = await ExchangeRate.find({ base, date: today }).lean();
    const map = {};
    allCached.forEach(r => { map[r.target] = r.rate; });
    return { base, date: today, rates: map, source: 'cache' };
  }

  // 请求外部 API
  try {
    const res = await axios.get(`${API_BASE}/${base}`, { timeout: 10000 });
    const rates = res.data.rates || {};
    const date = res.data.date || today;

    // 写入缓存（批量）
    const bulkOps = Object.entries(rates).map(([target, rate]) => ({
      updateOne: {
        filter: { base, target, date },
        update: { $set: { rate, updatedAt: new Date() } },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await ExchangeRate.bulkWrite(bulkOps);
    }

    // 清理 7 天前的旧缓存
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await ExchangeRate.deleteMany({ base, updatedAt: { $lt: sevenDaysAgo } });

    return { base, date, rates, source: 'api' };
  } catch (err) {
    console.error('[ExchangeRate] 获取汇率失败:', err.message);
    // 失败时返回最近一次缓存（不管日期）
    const fallback = await ExchangeRate.find({ base }).sort({ date: -1 }).lean();
    if (fallback.length > 0) {
      const map = {};
      fallback.forEach(r => { map[r.target] = r.rate; });
      return { base, date: fallback[0].date, rates: map, source: 'fallback' };
    }
    throw new Error('无法获取汇率');
  }
}

/**
 * 换算金额：从 sourceCurrency 换算到 targetCurrency
 */
async function convert(amount, sourceCurrency, targetCurrency, rates = null) {
  if (sourceCurrency === targetCurrency) return amount;
  if (!rates) {
    const data = await fetchLatestRates(targetCurrency);
    rates = data.rates;
  }
  // 如果目标货币是 base，直接查 sourceCurrency 的汇率
  // rate 表示 1 base = ? target
  // 所以 amount source = amount / rate(source) * rate(target)
  // 如果 rates 是以 targetCurrency 为 base 的：
  const sourceRate = rates[sourceCurrency];
  if (!sourceRate) return null; // 无法换算
  return amount / sourceRate;
}

/**
 * 多币种换算：将一组不同币种的金额统一换算成目标货币
 * items: [{ amount, currency }]
 * 返回 { total, details: [{ amount, currency, converted }] }
 */
async function convertMultiple(items, targetCurrency = 'CNY') {
  const rateData = await fetchLatestRates(targetCurrency);
  const rates = rateData.rates;

  let total = 0;
  const details = items.map(item => {
    const converted = item.currency === targetCurrency
      ? item.amount
      : (rates[item.currency] ? item.amount / rates[item.currency] : null);
    if (converted !== null) total += converted;
    return { ...item, converted: converted !== null ? Number(converted.toFixed(2)) : null };
  });

  return { total: Number(total.toFixed(2)), targetCurrency, details, rateDate: rateData.date };
}

module.exports = {
  fetchLatestRates,
  convert,
  convertMultiple
};
