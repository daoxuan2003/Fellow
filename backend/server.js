// ============================================
// 这是服务器的主文件，就像餐厅的前台经理
// 负责接收顾客的请求，然后安排厨房（数据库）处理
// ============================================

// 加载环境变量（从 .env 文件读取配置）
// 这样不同环境（开发/生产）可以用不同配置
require('dotenv').config();

// 引入 path 模块，用于处理文件路径
const path = require('path');

// 引入 express 模块，这是一个帮助我们快速搭建服务器的工具
// 就像租了一个已经装修好的店面，不用自己从头盖房子
const express = require('express');

// 引入 mongoose 模块，这是用来连接 MongoDB 数据库的工具
// 就像请了一个翻译，让我们能用 JavaScript 的方式和数据库对话
const mongoose = require('mongoose');

// 引入 cors 模块，这个用来解决"跨域"问题
// 因为前端和后端运行在不同的地址，就像两个国家，需要签证才能互通
const cors = require('cors');

// 引入文件存储服务
const storageService = require('./services/storage');

// 引入 WebSocket 服务
const { initWebSocketServer, notifyPartner } = require('./websocket');

// 引入 web-push，用于发送原生推送通知
const webpush = require('web-push');

// 引入通知文案配置
const { getPushPayload } = require('./config/notifications');

// 引入数据模型（User 用于 WebSocket 认证）
const { User } = require('./models');

// 引入路由
const routes = require('./routes');

// ============================================
// VAPID 密钥配置（用于 Web Push 通知）
// ============================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// 调试：打印密钥前10位（生产环境应删除）
console.log('[VAPID] 公钥:', VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY.substring(0, 15) + '...' : '未设置');
console.log('[VAPID] 私钥:', VAPID_PRIVATE_KEY ? '已设置 (' + VAPID_PRIVATE_KEY.substring(0, 10) + '...)' : '未设置');

// 配置 web-push
if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push 已配置成功');
  } catch (e) {
    console.error('❌ Web Push 配置失败:', e.message);
  }
} else {
  console.log('⚠️  VAPID 密钥未配置，推送通知功能不可用');
}

// 创建 express 应用实例，这就是我们服务器的本体
const app = express();

// ============================================
// 第一部分：连接数据库
// ============================================

// 从环境变量读取MongoDB连接字符串
// 本地开发：mongodb://localhost:27017/couple_db
// 生产环境：mongodb://用户名:密码@localhost:27017/couple_db?authSource=admin
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/couple_db';

// 连接 MongoDB 数据库
mongoose.connect(MONGODB_URI)
  .then(() => {
    // 连接成功的提示
    console.log('数据库连接成功！');
    console.log('当前环境：', process.env.NODE_ENV || 'development');
  })
  .catch((错误信息) => {
    // 连接失败的提示，打印错误原因
    console.log('数据库连接失败：', 错误信息);
    console.log('请检查 .env 文件中的 MONGODB_URI 配置');
  });

// ============================================
// 第二部分：数据模型
// ============================================
// 数据模型已拆分到 models/ 目录统一管理

// ============================================
// 第三部分：中间件配置
// ============================================

// 使用 cors 中间件，允许前端访问后端
// 就像在门口挂个牌子：欢迎光临
app.use(cors());

// 使用 express.json() 中间件，自动把收到的 JSON 数据转换成 JavaScript 对象
// 就像自动翻译机，把客人的话翻译成我们能听懂的语言
app.use(express.json());

// 本地开发时，提供 uploads 目录的静态文件访问
// 生产环境（S3模式）不需要，文件直接从雨云访问
if (storageService.STORAGE_MODE === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  console.log('✅ 静态文件服务: /uploads');
}

// ============================================
// 第四部分：API 接口（路由）
// ============================================

// 挂载所有路由
app.use('/api', routes);

// ============================================
// 第五部分：WebSocket 实时通信
// ============================================

// 所有 API 路由已迁移到 routes/ 目录

// 初始化 WebSocket 服务器
const WS_PORT = process.env.WS_PORT || 3001;
initWebSocketServer(WS_PORT);

// 导出通知函数，供路由使用
app.locals.notifyPartner = notifyPartner;

// ============================================
// 第六部分：启动服务器
// ============================================

// 设置服务器监听的端口号
// 从环境变量读取，如果没有设置则使用默认值
const PORT = process.env.PORT || 3000;

// 启动 HTTP 服务器
app.listen(PORT, () => {
  // 服务器启动成功的提示
  console.log('HTTP 服务器启动成功！');
  console.log('访问地址：http://localhost:' + PORT);
  console.log('API地址：http://localhost:' + PORT + '/api');
});

// 启动 WebSocket 服务器
// 注意：WebSocket端口在代码前面已经设置，这里只是提示信息
console.log('WebSocket 服务器将运行在 ws://localhost:' + WS_PORT);
