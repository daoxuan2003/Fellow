// ============================================
// 全局错误处理中间件
// ============================================

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，统一返回友好的错误响应
 * 
 * 注意：Express 错误处理中间件必须有 4 个参数 (err, req, res, next)
 */
const { logError } = require('../utils/safeLogger');

function errorHandler(err, req, res, next) {
  logError('错误处理中间件捕获到错误:', err);

  // 处理 multer 文件大小限制错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制'
    });
  }

  // 处理 multer 文件类型错误
  if (err.message && err.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // 处理 MongoDB 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} 已存在，请更换`
    });
  }

  // 处理 MongoDB 验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: messages
    });
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的登录凭证'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '登录已过期，请重新登录'
    });
  }

  // 处理 CastError（通常是 ObjectId 格式错误）
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `无效的 ${err.path}: ${err.value}`
    });
  }

  // 默认错误响应
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 ? '服务器内部错误' : (err.message || '请求处理失败'),
    // 开发环境下返回错误堆栈
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 处理 404 未找到的路由
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `找不到路径: ${req.method} ${req.path}`
  });
}

/**
 * 异步路由错误包装器
 * 用于捕获 async 路由中的错误，避免每个路由都写 try-catch
 * 
 * 使用方式：
 * app.get('/api/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
