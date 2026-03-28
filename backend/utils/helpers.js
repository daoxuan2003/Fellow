// ============================================
// 通用辅助函数
// ============================================

/**
 * 获取称呼（他/她/TA）
 * @param {string} gender - 性别 male/female
 * @returns {string} 称呼
 */
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

/**
 * 生成情侣ID（由两个用户ID排序后连接）
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @returns {string} coupleId
 */
function generateCoupleId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

/**
 * 格式化日期为字符串（YYYY-MM-DD）
 * @param {Date} date - 日期对象
 * @returns {string} 日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 获取今天的日期字符串
 * @returns {string} 今天的日期字符串
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 计算两个日期之间的天数差
 * @param {Date} date1 - 日期1
 * @param {Date} date2 - 日期2
 * @returns {number} 天数差
 */
function getDaysDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 生成随机配对码
 * @returns {string} 6位大写字母数字组合
 */
function generatePairCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * 安全地解析 JSON
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 过滤对象中的敏感字段
 * @param {object} obj - 原始对象
 * @param {string[]} fields - 要过滤的字段名
 * @returns {object} 过滤后的对象
 */
function filterSensitiveFields(obj, fields = ['password', '__v']) {
  const result = { ...obj };
  fields.forEach(field => delete result[field]);
  return result;
}

module.exports = {
  getPronoun,
  generateCoupleId,
  formatDate,
  getTodayString,
  getDaysDiff,
  generatePairCode,
  safeJsonParse,
  filterSensitiveFields
};
