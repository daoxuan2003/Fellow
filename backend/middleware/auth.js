// ============================================
// JWT 认证中间件
// ============================================

const jwt = require('jsonwebtoken');

// JWT 密钥，从环境变量读取（生产环境必须设置）
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-local-development-only';

/**
 * 验证用户是否登录的中间件
 * 就像夜店的保安，检查你有没有会员卡（token）
 * 
 * 使用方式：
 * app.get('/api/protected', authMiddleware, (req, res) => { ... })
 * 
 * 验证成功后，会在请求对象上附加：
 * - req.userId: 用户ID
 * - req.user: 完整的 decoded token 内容
 */
function authMiddleware(req, res, next) {
  // 从请求头中获取 token
  // 前端需要在 header 中发送：Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // 去掉 "Bearer " 前缀
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }
  
  try {
    // 验证 token 是否有效
    const decoded = jwt.verify(token, JWT_SECRET);
    // 把用户信息附加到请求对象上，后续接口可以直接使用
    req.userId = decoded.userId;
    req.user = decoded;
    next();  // 继续执行后续操作
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: '登录已过期，请重新登录'
    });
  }
}

module.exports = authMiddleware;
