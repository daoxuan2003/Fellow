// ============================================
// 中间件统一导出
// ============================================

module.exports = {
  // 认证中间件
  authMiddleware: require('./auth'),

  // 安全限流中间件
  ...require('./rateLimit'),

  // 请求参数校验中间件
  ...require('./validation'),
  
  // 文件上传中间件
  ...require('./upload'),
  
  // 错误处理中间件
  ...require('./errorHandler')
};
