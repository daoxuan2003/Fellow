// ============================================
// 中间件统一导出
// ============================================

module.exports = {
  // 认证中间件
  authMiddleware: require('./auth'),
  
  // 文件上传中间件
  ...require('./upload'),
  
  // 错误处理中间件
  ...require('./errorHandler')
};
