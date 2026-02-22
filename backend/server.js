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

// 引入 bcryptjs 模块，用来给密码加密
// 就像把密码放进保险箱，即使数据库被盗，坏人也不知道真实密码
const bcrypt = require('bcryptjs');

// 引入 jsonwebtoken 模块，用于生成和验证登录凭证（JWT）
// 就像给已登录用户发一张会员卡，之后凭卡入场
const jwt = require('jsonwebtoken');

// 引入 multer 模块，用于处理文件上传
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// 引入文件存储服务
const storageService = require('./services/storage');

// 引入 ws 模块，用于 WebSocket 实时通信
// 就像安装了一个对讲机，让服务器能主动推送消息给客户端
const WebSocket = require('ws');

// 引入 web-push，用于发送原生推送通知
const webpush = require('web-push');

// 引入通知文案配置
const { getPushPayload } = require('./config/notifications');

// JWT 密钥，从环境变量读取（生产环境必须设置）
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-local-development-only';
const JWT_EXPIRES = '7d';  // Token 有效期 7 天

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
// 第二部分：定义数据结构（Schema）
// ============================================

// 创建用户的数据模板，就像设计一张表格，规定要填写哪些信息
// Schema 就是"模式"的意思，告诉数据库每张表应该长什么样
const userSchema = new mongoose.Schema({
  // 用户的昵称，比如"小可爱"、"大笨蛋"
  nickname: {
    type: String,  // 类型是字符串（文字）
    required: true // required 表示必填，不写不行
  },
  
  // 登录用的账号，可以是邮箱或手机号
  account: {
    type: String,
    required: true,
    unique: true   // unique 表示唯一，不能有重复的账号
  },
  
  // 密码，会加密存储
  password: {
    type: String,
    required: true
  },
  
  // 配对码，用来让另一半找到你
  // 就像房间号，告诉对方房间号，对方就能找到你的房间
  pairCode: {
    type: String,
    required: true,
    unique: true   // 每个配对码也必须唯一
  },
  
  // 伴侣的ID，如果还没绑定，就是 null（空）
  partnerId: {
    type: String,
    default: null  // default 是默认值，一开始没有伴侣
  },
  
  // 绑定时间，记录什么时候成为情侣的
  boundAt: {
    type: Date,
    default: null
  },
  
  // 性别：male（男）/ female（女）
  gender: {
    type: String,
    default: null
  },
  
  // 个人简介/签名
  bio: {
    type: String,
    default: ''
  },
  
  // 头像（Base64 格式存储）
  avatar: {
    type: String,
    default: ''
  },
  
  // 对伴侣的备注/昵称
  partnerNote: {
    type: String,
    default: ''
  },
  
  // 生日
  birthday: {
    type: Date,
    default: null
  },
  
  // 恋爱纪念日
  anniversary: {
    type: Date,
    default: null
  },
  
  // ========== 邀请绑定相关字段 ==========
  
  // 邀请状态：idle（空闲）/ inviting（邀请中）/ invited（被邀请）/ bound（已绑定）
  inviteStatus: {
    type: String,
    enum: ['idle', 'inviting', 'invited', 'bound'],
    default: 'idle'
  },
  
  // 我发出的邀请对象ID（inviting状态时使用）
  invitingTo: {
    type: String,
    default: null
  },
  
  // 邀请发送时间
  inviteSentAt: {
    type: Date,
    default: null
  },
  
  // 最后更新时间，用于实时同步
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  
  // 创建时间，记录什么时候注册的
  createdAt: {
    type: Date,
    default: Date.now  // Date.now 是当前时间
  },
  
  // Push 订阅信息（用于发送原生通知）
  pushSubscriptions: [{
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
  }]
});

// 根据上面的模板，创建真正的"用户表"（在 MongoDB 里叫 Collection）
// 'User' 会变成数据库里的 'users'（自动变复数）
const User = mongoose.model('User', userSchema);

// ============================================
// 代取快递 Schema
// ============================================
const expressDeliverySchema = new mongoose.Schema({
  // 关联信息
  requesterId: {
    type: String,
    required: true
  },
  pickerId: {
    type: String,
    default: null
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 快递信息
  trackingNo: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // 优先级：normal(普通) / urgent(紧急)
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  
  // 状态：pending(待取) / picked(已取)
  status: {
    type: String,
    enum: ['pending', 'picked'],
    default: 'pending'
  },
  pickedAt: {
    type: Date,
    default: null
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ExpressDelivery = mongoose.model('ExpressDelivery', expressDeliverySchema);

// ============================================
// 取件地点 Schema（情侣共享）
// ============================================
const pickupLocationSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引：每对情侣的地点名唯一
pickupLocationSchema.index({ coupleId: 1, name: 1 }, { unique: true });

const PickupLocation = mongoose.model('PickupLocation', pickupLocationSchema);

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
// JWT 认证中间件
// ============================================

// 验证用户是否登录的中间件
// 就像夜店的保安，检查你有没有会员卡（token）
function authMiddleware(请求, 响应, 下一个) {
  // 从请求头中获取 token
  // 前端需要在 header 中发送：Authorization: Bearer <token>
  const authHeader = 请求.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // 去掉 "Bearer " 前缀
  
  if (!token) {
    return 响应.status(401).json({
      success: false,
      message: '请先登录'
    });
  }
  
  try {
    // 验证 token 是否有效
    const decoded = jwt.verify(token, JWT_SECRET);
    // 把用户信息附加到请求对象上，后续接口可以直接使用
    请求.userId = decoded.userId;
    请求.user = decoded;
    下一个();  // 继续执行后续操作
  } catch (错误) {
    return 响应.status(403).json({
      success: false,
      message: '登录已过期，请重新登录'
    });
  }
}

// ============================================
// 第四部分：API 接口（路由）
// ============================================

// 接口 1：注册新用户
// '/api/register' 是地址，就像门牌号
// async 表示这个函数里有"异步"操作（需要等待数据库回复）
app.post('/api/register', async (请求, 响应) => {
  try {
    // 从请求中拿到用户填写的信息
    // 请求.body 就是前端发来的数据
    const { nickname, account, password } = 请求.body;
    
    // 第一步：检查这个账号是否已经有人用了
    // await 表示"等待"，等数据库查完再继续
    // findOne 就是"查找一个"
    const 已有用户 = await User.findOne({ account: account });
    
    if (已有用户) {
      // 如果找到了，说明账号已存在，返回错误提示
      // status(400) 表示"请求参数错误"
      return 响应.status(400).json({
        success: false,      // success 表示是否成功
        message: '这个账号已经被注册了'  // message 是提示信息
      });
    }
    
    // 第二步：给密码加密
    // genSalt(10) 生成一个"盐"，让加密更安全
    // hash 就是加密后的密码
    const 盐 = await bcrypt.genSalt(10);
    const 加密密码 = await bcrypt.hash(password, 盐);
    
    // 第三步：生成配对码
    // Math.random() 生成 0-1 之间的随机数
    // toString(36) 转换成 36 进制的字符串（包含字母和数字）
    // substring(2, 8) 截取第 2 到第 8 个字符
    // toUpperCase() 转成大写字母
    const 配对码 = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 第四步：创建新用户
    // new User() 创建一个新用户对象
    const 新用户 = new User({
      nickname: nickname,      // 昵称
      account: account,        // 账号
      password: 加密密码,      // 加密后的密码
      pairCode: 配对码         // 生成的配对码
    });
    
    // 第五步：保存到数据库
    // save() 就是保存的意思
    await 新用户.save();
    
    // 第六步：生成 JWT Token
    const token = jwt.sign(
      { userId: 新用户._id, account: 新用户.account },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    // 第七步：返回成功信息和 token
    // json() 表示返回 JSON 格式的数据
    响应.status(201).json({  // 201 表示"创建成功"
      success: true,
      message: '注册成功',
      data: {
        token: token,
        expiresIn: JWT_EXPIRES
      }
    });
    
  } catch (错误) {
    // try...catch 用来捕获错误
    // 如果上面哪一步出错了，就会跳到这里
    console.log('注册出错：', 错误);
    响应.status(500).json({  // 500 表示"服务器内部错误"
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

// 接口 2：用户登录
app.post('/api/login', async (请求, 响应) => {
  try {
    // 拿到用户输入的账号和密码
    const { account, password } = 请求.body;
    
    // 第一步：查找这个账号是否存在
    const 用户 = await User.findOne({ account: account });
    
    // 如果没找到这个账号
    if (!用户) {
      return 响应.status(400).json({
        success: false,
        message: '账号或密码错误'  // 不告诉他是账号错了还是密码错了，为了安全
      });
    }
    
    // 第二步：验证密码是否正确
    // compare 用来比较用户输入的密码和数据库里加密的是否匹配
    const 密码正确 = await bcrypt.compare(password, 用户.password);
    
    if (!密码正确) {
      return 响应.status(400).json({
        success: false,
        message: '账号或密码错误'
      });
    }
    
    // 第三步：生成 JWT Token
    // 把用户ID放进 token，之后凭这个 token 就能识别用户身份
    const token = jwt.sign(
      { userId: 用户._id, account: 用户.account },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    // 第四步：返回 token 和基本信息
    // 前端保存 token，之后用 token 获取详细信息
    响应.json({
      success: true,
      message: '登录成功',
      data: {
        token: token,
        expiresIn: JWT_EXPIRES
      }
    });
    
  } catch (错误) {
    console.log('登录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

// 接口 2.5：检查存储状态（调试用）
app.get('/api/storage/status', authMiddleware, async (请求, 响应) => {
  const { STORAGE_MODE, s3Available, S3_BUCKET, S3_CONFIG } = require('./services/storage');
  
  响应.json({
    success: true,
    data: {
      mode: STORAGE_MODE,
      s3Available: s3Available,
      bucket: S3_BUCKET,
      endpoint: S3_CONFIG.endpoint,
      region: S3_CONFIG.region,
      // 不要返回敏感信息如 accessKey
      hasAccessKey: !!process.env.S3_ACCESS_KEY,
      hasSecretKey: !!process.env.S3_SECRET_KEY,
    }
  });
});

// 接口：获取 VAPID 公钥（用于 Web Push 订阅）
// 不需要认证，公钥是公开的
app.get('/api/vapid-public-key', (请求, 响应) => {
  响应.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY
  });
});

// 接口 3：获取当前登录用户信息
// 需要携带 JWT token，返回完整的用户信息
app.get('/api/me', authMiddleware, async (请求, 响应) => {
  try {
    // authMiddleware 已经把 userId 附加到请求对象上了
    const 用户 = await User.findById(请求.userId);
    
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 获取服务器基础 URL（用于生成完整头像 URL）
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    
    // 查找伴侣信息
    let 伴侣信息 = null;
    if (用户.partnerId) {
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        // 生成伴侣头像 URL
        let 伴侣头像Url = null;
        if (伴侣.avatar) {
          伴侣头像Url = await storageService.getUrl(伴侣.avatar, 3600, baseUrl);
        }
        
        伴侣信息 = {
          id: 伴侣._id,
          nickname: 伴侣.nickname,
          pairCode: 伴侣.pairCode,
          avatar: 伴侣.avatar,
          avatarUrl: 伴侣头像Url,
          bio: 伴侣.bio,
          gender: 伴侣.gender,
          birthday: 伴侣.birthday
        };
      }
    }
    
    // 生成自己的头像 URL
    let 头像Url = null;
    if (用户.avatar) {
      头像Url = await storageService.getUrl(用户.avatar, 3600, baseUrl);
    }
    
    响应.json({
      success: true,
      data: {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        pairCode: 用户.pairCode,
        avatar: 用户.avatar,
        avatarUrl: 头像Url,
        bio: 用户.bio,
        gender: 用户.gender,
        birthday: 用户.birthday,
        anniversary: 用户.anniversary,
        partnerNote: 用户.partnerNote,
        partnerId: 用户.partnerId,
        partner: 伴侣信息,
        boundAt: 用户.boundAt,
        inviteStatus: 用户.inviteStatus || 'idle',
        invitingTo: 用户.invitingTo,
        inviteSentAt: 用户.inviteSentAt,
        createdAt: 用户.createdAt
      }
    });
    
  } catch (错误) {
    console.log('获取用户信息出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 接口 4：绑定情侣
// 输入对方的配对码，完成绑定
app.post('/api/bind', authMiddleware, async (请求, 响应) => {
  try {
    // 从 token 获取用户ID
    const userId = 请求.userId;
    // 从 body 获取对方的配对码
    const { pairCode } = 请求.body;
    
    // 第一步：查找自己
    const 自己 = await User.findById(userId);
    if (!自己) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 第二步：检查自己是否已经绑定过了
    if (自己.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '你已经绑定过伴侣了，一个人只能有一个伴侣哦'
      });
    }
    
    // 第三步：根据配对码查找对方
    const 对方 = await User.findOne({ pairCode: pairCode });
    
    if (!对方) {
      return 响应.status(404).json({
        success: false,
        message: '找不到这个配对码，请检查是否输入正确'
      });
    }
    
    // 第四步：检查对方是不是自己
    if (对方._id.toString() === userId) {
      return 响应.status(400).json({
        success: false,
        message: '不能和自己绑定哦'
      });
    }
    
    // 第五步：检查对方是否已经被绑定了
    if (对方.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '对方已经有伴侣了'
      });
    }
    
    // 第六步：双向绑定
    // 获取当前时间作为绑定时间
    const 当前时间 = new Date();
    
    // 保存对方的ID到自己的资料里
    自己.partnerId = 对方._id.toString();
    自己.boundAt = 当前时间;
    await 自己.save();
    
    // 保存自己的ID到对方的资料里
    对方.partnerId = 自己._id.toString();
    对方.boundAt = 当前时间;
    await 对方.save();
    
    // 第七步：返回成功信息
    响应.json({
      success: true,
      message: '绑定成功！恭喜你们成为情侣',
      data: {
        partner: {
          id: 对方._id,
          nickname: 对方.nickname,
          pairCode: 对方.pairCode
        },
        boundAt: 当前时间
      }
    });
    
  } catch (错误) {
    console.log('绑定出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

// 获取当前用户资料
app.get('/api/user/profile', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const 用户 = await User.findById(userId);
    
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查找伴侣信息
    let 伴侣信息 = null;
    if (用户.partnerId) {
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        // 生成伴侣头像 URL
        let 伴侣头像Url = null;
        if (伴侣.avatar) {
          伴侣头像Url = await storageService.getUrl(伴侣.avatar, 3600, baseUrl);
        }
        
        伴侣信息 = {
          id: 伴侣._id,
          nickname: 伴侣.nickname,
          pairCode: 伴侣.pairCode,
          birthday: 伴侣.birthday,
          avatar: 伴侣头像Url,
          avatarUrl: 伴侣头像Url
        };
      }
    }
    
    // 生成头像 URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    let 头像Url = null;
    if (用户.avatar) {
      头像Url = await storageService.getUrl(用户.avatar, 3600, baseUrl);
    }
    
    响应.json({
      success: true,
      user: {
        id: 用户._id,
        name: 用户.nickname,
        nickname: 用户.nickname,
        account: 用户.account,
        inviteCode: 用户.pairCode,
        pairCode: 用户.pairCode,
        avatar: 头像Url,
        gender: 用户.gender,
        birthday: 用户.birthday,
        anniversary: 用户.anniversary,
        bio: 用户.bio,
        partnerNote: 用户.partnerNote,
        partnerId: 用户.partnerId,
        partner: 伴侣信息,
        boundAt: 用户.boundAt,
        connected: !!用户.partnerId
      }
    });
  } catch (错误) {
    console.log('获取用户资料出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新用户资料
app.put('/api/user/profile', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { name, gender, birthday, anniversary, bio, partnerNote } = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 更新字段
    if (name) 用户.nickname = name;
    if (gender) 用户.gender = gender;
    if (bio !== undefined) 用户.bio = bio;
    if (partnerNote !== undefined) 用户.partnerNote = partnerNote;
    if (birthday) 用户.birthday = new Date(birthday);
    
    // anniversary（恋爱纪念日）是双方共享的，需要同步更新
    let 同步纪念日 = false;
    if (anniversary !== undefined && anniversary !== '') {
      const newDate = new Date(anniversary);
      用户.anniversary = newDate;
      同步纪念日 = true;
    }
    
    await 用户.save();
    
    // 如果修改了纪念日且存在伴侣，同步更新伴侣的纪念日
    if (同步纪念日 && 用户.partnerId) {
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        伴侣.anniversary = 用户.anniversary;
        await 伴侣.save();
      }
    }
    
    // 生成头像 URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    const avatarUrl = 用户.avatar ? await storageService.getUrl(用户.avatar, 3600, baseUrl) : null;
    
    // 如果有伴侣，推送更新通知
    if (用户.partnerId) {
      notifyPartner(用户.partnerId, {
        type: 'partnerUpdated',
        data: {
          id: 用户._id,
          nickname: 用户.nickname,
          avatar: avatarUrl,
          gender: 用户.gender,
          bio: 用户.bio,
          birthday: 用户.birthday,
          anniversary: 用户.anniversary
        }
      });
    }
    
    响应.json({
      success: true,
      message: '保存成功',
      user: {
        id: 用户._id,
        name: 用户.nickname,
        nickname: 用户.nickname,
        gender: 用户.gender,
        bio: 用户.bio,
        birthday: 用户.birthday,
        anniversary: 用户.anniversary,
        partnerNote: 用户.partnerNote,
        avatar: avatarUrl
      }
    });
  } catch (错误) {
    console.log('更新用户资料出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了: ' + 错误.message
    });
  }
});

// 修改密码
app.put('/api/user/password', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { currentPassword, newPassword } = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证当前密码
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, 用户.password);
    if (!isValid) {
      return 响应.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    用户.password = hashedPassword;
    await 用户.save();
    
    响应.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (错误) {
    console.log('修改密码出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 上传头像
app.post('/api/user/avatar', authMiddleware, upload.single('avatar'), async (请求, 响应) => {
  try {
    if (!请求.file) {
      return 响应.status(400).json({
        success: false,
        message: '请选择图片'
      });
    }
    
    const userId = 请求.userId;
    const 用户 = await User.findById(userId);
    
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(请求.file.mimetype)) {
      return 响应.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
      });
    }
    
    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (请求.file.size > maxSize) {
      return 响应.status(400).json({
        success: false,
        message: '图片大小不能超过 5MB'
      });
    }
    
    // 删除旧头像
    if (用户.avatar && 用户.avatar.startsWith('avatars/')) {
      try {
        await storageService.delete(用户.avatar);
      } catch (e) {
        console.log('删除旧头像失败:', e.message);
      }
    }
    
    // 上传新头像
    const filePath = await storageService.upload(
      请求.file.buffer,
      'avatar',
      userId,
      null,
      请求.file.originalname,
      { nickname: 用户.nickname }
    );
    
    // 更新用户头像
    用户.avatar = filePath;
    await 用户.save();
    
    // 生成URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    const avatarUrl = await storageService.getUrl(filePath, 3600, baseUrl);
    
    // 通知伴侣头像更新（如果已绑定）
    if (用户.partnerId && clients.has(用户.partnerId)) {
      const partnerWs = clients.get(用户.partnerId);
      partnerWs.send(JSON.stringify({
        type: 'partnerUpdated',
        data: {
          avatar: avatarUrl
        }
      }));
    }
    
    响应.json({
      success: true,
      message: '头像上传成功',
      avatarUrl: avatarUrl
    });
  } catch (错误) {
    console.log('上传头像出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了: ' + 错误.message
    });
  }
});

// ============================================
// 推送通知订阅接口
// ============================================

// 订阅 Push 通知
app.post('/api/notifications/subscribe', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { subscription } = 请求.body;
    
    if (!subscription || !subscription.endpoint) {
      return 响应.status(400).json({
        success: false,
        message: '订阅信息不完整'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否已存在相同的订阅
    const 已存在 = 用户.pushSubscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!已存在) {
      // 添加新订阅
      用户.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: new Date()
      });
      
      await 用户.save();
      console.log(`用户 ${用户.nickname} 订阅了 Push 通知`);
    }
    
    响应.json({
      success: true,
      message: '订阅成功'
    });
  } catch (错误) {
    console.log('订阅 Push 出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 取消订阅 Push 通知
app.post('/api/notifications/unsubscribe', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { endpoint } = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 删除匹配的订阅
    用户.pushSubscriptions = 用户.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await 用户.save();
    console.log(`用户 ${用户.nickname} 取消了 Push 订阅`);
    
    响应.json({
      success: true,
      message: '取消订阅成功'
    });
  } catch (错误) {
    console.log('取消订阅 Push 出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 发送推送通知的辅助函数
// ============================================

/**
 * 向指定用户发送推送通知
 * @param {string} userId - 用户ID
 * @param {object} payload - 通知内容 { title, body, icon, data }
 */
async function sendPushToUser(userId, payload) {
  if (!VAPID_PRIVATE_KEY) {
    console.log('[Push] 未配置私钥，无法发送推送');
    return;
  }
  
  try {
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.pushSubscriptions || 用户.pushSubscriptions.length === 0) {
      return;
    }
    
    const pushPayload = JSON.stringify({
      title: payload.title || '共赴',
      body: payload.body || '',
      icon: payload.icon || '/heart.svg',
      data: payload.data || {}
    });
    
    // 向所有订阅的设备发送
    const 发送任务 = 用户.pushSubscriptions.map(async (订阅) => {
      try {
        await webpush.sendNotification({
          endpoint: 订阅.endpoint,
          keys: {
            p256dh: 订阅.keys.p256dh,
            auth: 订阅.keys.auth
          }
        }, pushPayload);
        console.log(`[Push] 发送成功: ${用户.nickname}`);
      } catch (错误) {
        console.error(`[Push] 发送失败: ${用户.nickname}`, 错误.message, '状态码:', 错误.statusCode);
        // 如果是 410/404，说明订阅已过期，需要删除
        if (错误.statusCode === 410 || 错误.statusCode === 404) {
          用户.pushSubscriptions = 用户.pushSubscriptions.filter(
            sub => sub.endpoint !== 订阅.endpoint
          );
          await 用户.save();
          console.log(`[Push] 已删除过期订阅: ${用户.nickname}`);
        } else {
          console.error(`[Push] 详细错误:`, 错误);
        }
      }
    });
    
    await Promise.all(发送任务);
  } catch (错误) {
    console.error('[Push] 发送出错:', 错误);
  }
}

/**
 * 向伴侣发送推送通知
 * @param {string} partnerId - 伴侣ID
 * @param {object} payload - 通知内容
 */
async function notifyPartnerPush(partnerId, payload) {
  await sendPushToUser(partnerId, payload);
}

// 测试推送接口（仅开发使用）
app.post('/api/notifications/test', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    if (!VAPID_PRIVATE_KEY) {
      return 响应.status(500).json({
        success: false,
        message: '服务器未配置 VAPID 私钥'
      });
    }
    
    await sendPushToUser(userId, getPushPayload('test'));
    
    响应.json({
      success: true,
      message: '测试推送已发送'
    });
  } catch (错误) {
    console.error('测试推送失败:', 错误);
    响应.status(500).json({
      success: false,
      message: '发送失败: ' + 错误.message
    });
  }
});

// 解除伴侣关系
app.post('/api/couple/unbind', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const 自己 = await User.findById(userId);
    
    if (!自己 || !自己.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '你还没有伴侣'
      });
    }
    
    const 对方Id = 自己.partnerId.toString();
    const 对方 = await User.findById(对方Id);
    
    // 清除双方绑定和共同信息
    自己.partnerId = null;
    自己.boundAt = null;
    自己.anniversary = null;
    自己.inviteStatus = 'idle';
    自己.invitingTo = null;
    await 自己.save();
    
    if (对方) {
      对方.partnerId = null;
      对方.boundAt = null;
      对方.anniversary = null;
      对方.inviteStatus = 'idle';
      对方.invitingTo = null;
      await 对方.save();
      
      // 通知对方已解除绑定
      notifyPartner(对方Id, {
        type: 'unbound',
        data: {
          by: {
            id: 自己._id,
            nickname: 自己.nickname
          }
        }
      });
      
      // 发送 Push 通知
      await notifyPartnerPush(对方Id, getPushPayload('unbound', 
        { nickname: 自己.nickname }
      ));
    }
    
    响应.json({
      success: true,
      message: '已解除伴侣关系'
    });
  } catch (错误) {
    console.log('解除绑定出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 接口 4：获取用户信息（用于刷新页面时获取最新数据）
app.get('/api/user/:userId', async (请求, 响应) => {
  try {
    // 从网址参数中获取用户ID
    // :userId 是占位符，表示这里会传入一个ID
    const userId = 请求.params.userId;
    
    // 查找用户
    const 用户 = await User.findById(userId);
    
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查找伴侣信息
    let 伴侣信息 = null;
    if (用户.partnerId) {
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        伴侣信息 = {
          id: 伴侣._id,
          nickname: 伴侣.nickname,
          pairCode: 伴侣.pairCode
        };
      }
    }
    
    // 生成头像 URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    let 头像Url = null;
    if (用户.avatar) {
      头像Url = await storageService.getUrl(用户.avatar, 3600, baseUrl);
    }
    
    // 返回用户信息
    响应.json({
      success: true,
      data: {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        pairCode: 用户.pairCode,
        avatar: 用户.avatar,
        avatarUrl: 头像Url,
        bio: 用户.bio,
        gender: 用户.gender,
        partnerId: 用户.partnerId,
        partner: 伴侣信息,
        boundAt: 用户.boundAt,
        createdAt: 用户.createdAt,
        // 邀请相关字段
        inviteStatus: 用户.inviteStatus || 'idle',
        invitingTo: 用户.invitingTo,
        inviteSentAt: 用户.inviteSentAt
      }
    });
    
  } catch (错误) {
    console.log('获取用户信息出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 接口 5：解除绑定（如果需要分手功能的话，暂时留着备用）
app.post('/api/unbind', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 查找自己
    const 自己 = await User.findById(userId);
    if (!自己 || !自己.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '你还没有伴侣'
      });
    }
    
    // 查找对方
    const 对方 = await User.findById(自己.partnerId);
    
    // 清除双方的绑定关系
    自己.partnerId = null;
    自己.boundAt = null;
    自己.inviteStatus = 'idle';  // 重置为空闲状态
    自己.invitingTo = null;
    await 自己.save();
    
    if (对方) {
      对方.partnerId = null;
      对方.boundAt = null;
      对方.inviteStatus = 'idle';  // 对方也重置为空闲状态
      对方.invitingTo = null;
      await 对方.save();
      
      // 通过 WebSocket 通知对方
      notifyPartner(对方._id, {
        type: 'unbound',
        data: {
          by: {
            id: 自己._id,
            nickname: 自己.nickname
          }
        }
      });
    }
    
    响应.json({
      success: true,
      message: '已解除绑定'
    });
    
  } catch (错误) {
    console.log('解除绑定出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 接口 5.5：上传头像
// 使用 multer 处理单文件上传，字段名为 'avatar'
app.post('/api/upload/avatar', authMiddleware, upload.single('avatar'), async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 检查是否有文件
    if (!请求.file) {
      return 响应.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }
    
    // 获取当前用户信息
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(请求.file.mimetype)) {
      return 响应.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
      });
    }
    
    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (请求.file.size > maxSize) {
      return 响应.status(400).json({
        success: false,
        message: '图片大小不能超过 5MB'
      });
    }
    
    // 如果之前有头像，删除旧文件
    if (用户.avatar && 用户.avatar.startsWith('avatars/')) {
      try {
        await storageService.delete(用户.avatar);
      } catch (e) {
        console.log('删除旧头像失败:', e.message);
      }
    }
    
    // 上传新头像到存储服务（使用昵称作为文件名）
    const filePath = await storageService.upload(
      请求.file.buffer,
      'avatar',
      userId,
      null, // 头像不需要 partnerId
      请求.file.originalname,
      { nickname: 用户.nickname }
    );
    
    // 更新用户头像路径
    用户.avatar = filePath;
    await 用户.save();
    
    // 获取访问 URL（传入服务器基础 URL）
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    const avatarUrl = await storageService.getUrl(filePath, 3600, baseUrl);
    
    // 通知伴侣头像更新（如果已绑定）
    if (用户.partnerId) {
      notifyPartner(用户.partnerId, {
        type: 'partnerUpdated',
        data: {
          avatar: avatarUrl
        }
      });
    }
    
    响应.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: filePath,
        avatarUrl: avatarUrl
      }
    });
    
  } catch (错误) {
    console.log('上传头像出错:', 错误);
    响应.status(500).json({
      success: false,
      message: '上传失败，请重试'
    });
  }
});

// 接口 6：更新用户资料
app.post('/api/user/update', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    const { 
      nickname, 
      account, 
      password, 
      gender, 
      bio, 
      avatar,
      boundAt,
      partnerNote 
    } = 请求.body;
    
    // 查找用户
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 如果要修改账号，检查是否已被占用
    if (account && account !== 用户.account) {
      const 已有用户 = await User.findOne({ account: account });
      if (已有用户) {
        return 响应.status(400).json({
          success: false,
          message: '该账号已被使用'
        });
      }
      用户.account = account;
    }
    
    // 更新其他字段
    if (nickname) 用户.nickname = nickname;
    if (gender) 用户.gender = gender;
    if (bio !== undefined) 用户.bio = bio;
    // 注意：avatar 不再通过此接口更新，请使用 /api/upload/avatar
    if (partnerNote !== undefined) 用户.partnerNote = partnerNote;
    // 更新生日
    if (请求.body.birthday) 用户.birthday = new Date(请求.body.birthday);
    
    // 更新相爱日期
    if (boundAt) {
      用户.boundAt = new Date(boundAt);
      
      // 同时更新伴侣的日期
      if (用户.partnerId) {
        const 伴侣 = await User.findById(用户.partnerId);
        if (伴侣) {
          伴侣.boundAt = 用户.boundAt;
          await 伴侣.save();
        }
      }
    }
    
    // 更新密码
    if (password) {
      const 盐 = await bcrypt.genSalt(10);
      用户.password = await bcrypt.hash(password, 盐);
    }
    
    // 更新最后更新时间
    用户.lastUpdate = new Date();
    
    // 保存更改
    await 用户.save();
    
    // 准备返回的数据
    let 头像Url = null;
    if (用户.avatar) {
      头像Url = await storageService.getUrl(用户.avatar, 3600, baseUrl);
    }
    
    const 返回数据 = {
      id: 用户._id,
      nickname: 用户.nickname,
      account: 用户.account,
      gender: 用户.gender,
      bio: 用户.bio,
      birthday: 用户.birthday,
      avatar: 用户.avatar,
      avatarUrl: 头像Url,
      pairCode: 用户.pairCode,
      partnerId: 用户.partnerId,
      partnerNote: 用户.partnerNote,
      boundAt: 用户.boundAt,
      lastUpdate: 用户.lastUpdate,
      // 邀请相关字段
      inviteStatus: 用户.inviteStatus || 'idle',
      invitingTo: 用户.invitingTo,
      inviteSentAt: 用户.inviteSentAt
    };
    
    // 如果有伴侣，通过 WebSocket 通知对方
    if (用户.partnerId) {
      notifyPartner(用户.partnerId, {
        type: 'partnerUpdated',
        data: {
          birthday: 用户.birthday,
          boundAt: 用户.boundAt,
          partner: 返回数据  // 发送更新后的用户信息给伴侣
        }
      });
    }
    
    // 返回更新后的用户信息
    响应.json({
      success: true,
      message: '更新成功',
      data: 返回数据
    });
    
  } catch (错误) {
    console.log('更新用户资料出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 接口 7：发送绑定邀请
app.post('/api/invite/send', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { pairCode } = 请求.body;
    
    // 查找发送者
    const 发送者 = await User.findById(userId);
    if (!发送者) {
      return 响应.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查发送者状态
    if (发送者.inviteStatus !== 'idle') {
      return 响应.status(400).json({ 
        success: false, 
        message: 发送者.inviteStatus === 'bound' ? '您已经绑定了伴侣' : '您有未处理的邀请'
      });
    }
    
    // 查找接收者
    const 接收者 = await User.findOne({ pairCode: pairCode.toUpperCase() });
    if (!接收者) {
      return 响应.status(404).json({ success: false, message: '配对码不存在' });
    }
    
    // 不能邀请自己
    if (接收者._id.toString() === userId) {
      return 响应.status(400).json({ success: false, message: '不能邀请自己' });
    }
    
    // 检查接收者状态
    if (接收者.inviteStatus === 'bound') {
      return 响应.status(400).json({ success: false, message: '对方已经绑定了伴侣' });
    }
    if (接收者.inviteStatus !== 'idle') {
      return 响应.status(400).json({ success: false, message: '对方有未处理的邀请' });
    }
    
    // 更新发送者状态
    发送者.inviteStatus = 'inviting';
    发送者.invitingTo = 接收者._id.toString();
    发送者.inviteSentAt = new Date();
    发送者.lastUpdate = new Date();
    await 发送者.save();
    
    // 更新接收者状态
    接收者.inviteStatus = 'invited';
    接收者.invitingTo = 发送者._id.toString();  // 记录是谁邀请的
    接收者.lastUpdate = new Date();
    await 接收者.save();
    
    // 生成发送者头像 URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    let 发送者头像Url = null;
    if (发送者.avatar) {
      发送者头像Url = await storageService.getUrl(发送者.avatar, 3600, baseUrl);
    }
    
    // 生成接收者头像 URL
    let 接收者头像Url = null;
    if (接收者.avatar) {
      接收者头像Url = await storageService.getUrl(接收者.avatar, 3600, baseUrl);
    }
    
    // 通过 WebSocket 通知接收者
    notifyPartner(接收者._id.toString(), {
      type: 'inviteReceived',
      data: {
        from: {
          id: 发送者._id,
          nickname: 发送者.nickname,
          avatar: 发送者.avatar,
          avatarUrl: 发送者头像Url,
          bio: 发送者.bio,
          gender: 发送者.gender
        }
      }
    });
    
    // 发送 Push 通知
    await notifyPartnerPush(接收者._id.toString(), getPushPayload('inviteReceived',
      { nickname: 发送者.nickname },
      { fromId: 发送者._id.toString() }
    ));
    
    响应.json({
      success: true,
      message: '邀请已发送',
      data: {
        to: {
          id: 接收者._id,
          nickname: 接收者.nickname,
          avatar: 接收者.avatar,
          avatarUrl: 接收者头像Url,
          bio: 接收者.bio,
          gender: 接收者.gender
        }
      }
    });
    
  } catch (错误) {
    console.log('发送邀请出错：', 错误);
    响应.status(500).json({ success: false, message: '服务器出错了' });
  }
});

// 接口 8：接受邀请
app.post('/api/invite/accept', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 查找接收者（当前用户）
    const 接收者 = await User.findById(userId);
    if (!接收者) {
      return 响应.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查状态
    if (接收者.inviteStatus !== 'invited') {
      return 响应.status(400).json({ success: false, message: '没有待接受的邀请' });
    }
    
    // 查找发送者
    const 发送者 = await User.findById(接收者.invitingTo);
    if (!发送者) {
      return 响应.status(404).json({ success: false, message: '邀请者不存在' });
    }
    
    // 检查发送者状态是否还是 inviting
    if (发送者.inviteStatus !== 'inviting' || 发送者.invitingTo !== userId) {
      return 响应.status(400).json({ success: false, message: '邀请已失效' });
    }
    
    const 当前时间 = new Date();
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    
    // 处理纪念日：双方共享，优先使用接收者设置的，其次发送者，最后默认用绑定时间
    let 共享纪念日 = 接收者.anniversary || 发送者.anniversary || 当前时间;
    
    // 更新双方状态为已绑定
    接收者.inviteStatus = 'bound';
    接收者.partnerId = 发送者._id.toString();
    接收者.boundAt = 当前时间;
    接收者.anniversary = 共享纪念日;
    接收者.invitingTo = null;
    接收者.lastUpdate = 当前时间;
    await 接收者.save();
    
    发送者.inviteStatus = 'bound';
    发送者.partnerId = 接收者._id.toString();
    发送者.boundAt = 当前时间;
    发送者.anniversary = 共享纪念日;
    发送者.invitingTo = null;
    发送者.lastUpdate = 当前时间;
    await 发送者.save();
    
    // 生成头像 URL
    const 接收者头像Url = 接收者.avatar ? await storageService.getUrl(接收者.avatar, 3600, baseUrl) : null;
    const 发送者头像Url = 发送者.avatar ? await storageService.getUrl(发送者.avatar, 3600, baseUrl) : null;
    
    // 通知发送者
    notifyPartner(发送者._id.toString(), {
      type: 'inviteAccepted',
      data: {
        partner: {
          id: 接收者._id,
          nickname: 接收者.nickname,
          avatar: 接收者头像Url,
          gender: 接收者.gender,
          bio: 接收者.bio
        },
        boundAt: 当前时间,
        anniversary: 共享纪念日,
        inviteStatus: 'bound'
      }
    });
    
    // 发送 Push 通知
    await notifyPartnerPush(发送者._id.toString(), getPushPayload('inviteAccepted',
      { nickname: 接收者.nickname },
      { partnerId: 接收者._id.toString() }
    ));
    
    响应.json({
      success: true,
      message: '绑定成功！恭喜你们成为情侣',
      data: {
        partner: {
          id: 发送者._id,
          nickname: 发送者.nickname,
          avatar: 发送者头像Url,
          gender: 发送者.gender,
          bio: 发送者.bio
        },
        boundAt: 当前时间,
        anniversary: 共享纪念日
      }
    });
    
  } catch (错误) {
    console.log('接受邀请出错：', 错误);
    响应.status(500).json({ success: false, message: '服务器出错了' });
  }
});

// 接口 9：拒绝邀请
app.post('/api/invite/reject', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 查找接收者
    const 接收者 = await User.findById(userId);
    if (!接收者) {
      return 响应.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查状态
    if (接收者.inviteStatus !== 'invited') {
      return 响应.status(400).json({ success: false, message: '没有待处理的邀请' });
    }
    
    // 查找发送者
    const 发送者Id = 接收者.invitingTo;
    const 发送者 = await User.findById(发送者Id);
    
    // 重置双方状态
    接收者.inviteStatus = 'idle';
    接收者.invitingTo = null;
    接收者.inviteSentAt = null;
    接收者.lastUpdate = new Date();
    await 接收者.save();
    
    if (发送者 && 发送者.inviteStatus === 'inviting') {
      发送者.inviteStatus = 'idle';
      发送者.invitingTo = null;
      发送者.inviteSentAt = null;
      发送者.lastUpdate = new Date();
      await 发送者.save();
      
      // 通知发送者
      notifyPartner(发送者Id, {
        type: 'inviteRejected',
        data: {
          by: {
            id: 接收者._id,
            nickname: 接收者.nickname
          }
        }
      });
      
      // 发送 Push 通知
      await notifyPartnerPush(发送者Id, getPushPayload('inviteRejected',
        { nickname: 接收者.nickname }
      ));
    }
    
    响应.json({ success: true, message: '已拒绝邀请' });
    
  } catch (错误) {
    console.log('拒绝邀请出错：', 错误);
    响应.status(500).json({ success: false, message: '服务器出错了' });
  }
});

// 接口 10：取消发出的邀请
app.post('/api/invite/cancel', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 查找发送者
    const 发送者 = await User.findById(userId);
    if (!发送者) {
      return 响应.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查状态
    if (发送者.inviteStatus !== 'inviting') {
      return 响应.status(400).json({ success: false, message: '没有待取消的邀请' });
    }
    
    // 查找接收者
    const 接收者Id = 发送者.invitingTo;
    const 接收者 = await User.findById(接收者Id);
    
    // 重置双方状态
    发送者.inviteStatus = 'idle';
    发送者.invitingTo = null;
    发送者.inviteSentAt = null;
    发送者.lastUpdate = new Date();
    await 发送者.save();
    
    if (接收者 && 接收者.inviteStatus === 'invited') {
      接收者.inviteStatus = 'idle';
      接收者.invitingTo = null;
      接收者.inviteSentAt = null;
      接收者.lastUpdate = new Date();
      await 接收者.save();
      
      // 通知接收者
      notifyPartner(接收者Id, {
        type: 'inviteCancelled',
        data: {
          by: {
            id: 发送者._id,
            nickname: 发送者.nickname
          }
        }
      });
      
      // 发送 Push 通知
      await notifyPartnerPush(接收者Id, getPushPayload('inviteCancelled',
        { nickname: 发送者.nickname }
      ));
    }
    
    响应.json({ success: true, message: '已取消邀请' });
    
  } catch (错误) {
    console.log('取消邀请出错：', 错误);
    响应.status(500).json({ success: false, message: '服务器出错了' });
  }
});

// 接口 12：检查数据同步状态（用于实时更新）
app.get('/api/sync', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const lastSync = 请求.query.lastSync;  // 客户端上次同步时间
    
    // 查找用户
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否有更新
    const hasUpdate = !lastSync || new Date(用户.lastUpdate) > new Date(lastSync);
    
    // 获取伴侣信息（如果已绑定）
    let 伴侣信息 = null;
    let 伴侣有更新 = false;
    
    if (用户.partnerId) {
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        伴侣信息 = {
          id: 伴侣._id,
          nickname: 伴侣.nickname,
          avatar: 伴侣.avatar,
          gender: 伴侣.gender,
          bio: 伴侣.bio,
          lastUpdate: 伴侣.lastUpdate
        };
        
        // 检查伴侣是否有更新
        伴侣有更新 = !lastSync || new Date(伴侣.lastUpdate) > new Date(lastSync);
      }
    }
    
    响应.json({
      success: true,
      hasUpdate: hasUpdate || 伴侣有更新,
      userUpdate: hasUpdate,
      partnerUpdate: 伴侣有更新,
      lastUpdate: 用户.lastUpdate,
      data: hasUpdate ? {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        gender: 用户.gender,
        bio: 用户.bio,
        avatar: 用户.avatar,
        pairCode: 用户.pairCode,
        partnerId: 用户.partnerId,
        partnerNote: 用户.partnerNote,
        boundAt: 用户.boundAt,
        lastUpdate: 用户.lastUpdate
      } : null,
      partner: 伴侣信息
    });
    
  } catch (错误) {
    console.log('同步检查出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 代取快递 API
// ============================================

// 获取称呼辅助函数
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

// 创建快递请求
app.post('/api/express', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { trackingNo, pickupLocation, description, priority } = 请求.body;
    
    if (!trackingNo || !pickupLocation) {
      return 响应.status(400).json({
        success: false,
        message: '取件码和取件地点不能为空'
      });
    }
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户) {
      return 响应.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否已绑定伴侣
    if (!用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    
    // 创建快递记录
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const 快递 = new ExpressDelivery({
      requesterId: userId,
      coupleId,
      trackingNo: trackingNo.trim(),
      pickupLocation: pickupLocation.trim(),
      description: description?.trim() || '',
      priority: priority === 'urgent' ? 'urgent' : 'normal'
    });
    
    await 快递.save();
    
    // 获取伴侣信息（用于备注名）
    const 伴侣 = await User.findById(用户.partnerId);
    const 显示名 = 伴侣?.partnerNote || 用户.nickname;
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: 'expressNew',
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        pickupLocation: 快递.pickupLocation,
        description: 快递.description,
        from: {
          id: 用户._id,
          nickname: 用户.nickname,
          partnerNote: 用户.partnerNote,
          displayName: 显示名,
          gender: 用户.gender
        }
      }
    });
    
    // 发送 Push 通知（优先使用备注名）
    await notifyPartnerPush(用户.partnerId, getPushPayload('expressNew', {
      nickname: 显示名,
      item: 快递.description,
      location: 快递.pickupLocation
    }, { expressId: 快递._id.toString() }));
    
    响应.json({
      success: true,
      message: '添加成功',
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        pickupLocation: 快递.pickupLocation,
        description: 快递.description,
        status: 快递.status,
        requesterId: 快递.requesterId,
        pickerId: null,
        createdAt: 快递.createdAt
      }
    });
    
  } catch (错误) {
    console.log('创建快递请求出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取快递列表
app.get('/api/express', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { status } = 请求.query; // pending 或 picked，不传则返回全部
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.json({
        success: true,
        data: {
          pending: [],
          picked: []
        }
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 构建查询条件
    const query = { coupleId };
    if (status) {
      query.status = status;
    }
    
    // 查询快递列表
    const 快递列表 = await ExpressDelivery.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    
    // 获取创建者和取件人信息
    const userIds = [...new Set([
      ...快递列表.map(e => e.requesterId),
      ...快递列表.map(e => e.pickerId).filter(Boolean)
    ])];
    
    const 用户信息 = {};
    const 用户列表 = await User.find({ _id: { $in: userIds } });
    用户列表.forEach(u => {
      用户信息[u._id.toString()] = {
        id: u._id,
        nickname: u.nickname,
        gender: u.gender,
        avatar: u.avatar
      };
    });
    
    // 组装数据
    const 结果 = 快递列表.map(快递 => ({
      id: 快递._id,
      trackingNo: 快递.trackingNo,
      pickupLocation: 快递.pickupLocation,
      description: 快递.description,
      priority: 快递.priority || 'normal',
      status: 快递.status,
      requesterId: 快递.requesterId,
      pickerId: 快递.pickerId,
      requester: 用户信息[快递.requesterId] || null,
      picker: 快递.pickerId ? (用户信息[快递.pickerId] || null) : null,
      createdAt: 快递.createdAt,
      pickedAt: 快递.pickedAt
    }));
    
    响应.json({
      success: true,
      data: {
        list: 结果,
        pending: 结果.filter(e => e.status === 'pending'),
        picked: 结果.filter(e => e.status === 'picked')
      }
    });
    
  } catch (错误) {
    console.log('获取快递列表出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 标记取件
app.put('/api/express/:id/pick', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const expressId = 请求.params.id;
    
    // 获取快递记录
    const 快递 = await ExpressDelivery.findById(expressId);
    if (!快递) {
      return 响应.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    // 检查权限（必须是情侣关系中的一员）
    const 用户 = await User.findById(userId);
    if (!用户 || 快递.coupleId !== [userId, 用户.partnerId].sort().join('_')) {
      return 响应.status(403).json({
        success: false,
        message: '无权操作'
      });
    }
    
    // 检查状态
    if (快递.status !== 'pending') {
      return 响应.status(400).json({
        success: false,
        message: '该快递已被取件'
      });
    }
    
    // 更新状态
    快递.status = 'picked';
    快递.pickerId = userId;
    快递.pickedAt = new Date();
    await 快递.save();
    
    // 通知对方
    const 通知对象Id = 快递.requesterId === userId ? 用户.partnerId : 快递.requesterId;
    
    // 获取对方信息（用于显示备注名）
    const 对方 = await User.findById(通知对象Id);
    const 显示名 = 对方?.partnerNote || 用户.nickname;
    
    notifyPartner(通知对象Id, {
      type: 'expressPicked',
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        description: 快递.description,
        picker: {
          id: 用户._id,
          nickname: 用户.nickname,
          partnerNote: 用户.partnerNote,
          displayName: 显示名,
          gender: 用户.gender
        }
      }
    });
    
    // 发送 Push 通知（优先使用备注名）
    await notifyPartnerPush(通知对象Id, getPushPayload('expressPicked', {
      nickname: 显示名,
      item: 快递.description
    }, { expressId: 快递._id.toString() }));
    
    响应.json({
      success: true,
      message: '取件成功',
      data: {
        id: 快递._id,
        status: 快递.status,
        pickerId: 快递.pickerId,
        pickedAt: 快递.pickedAt
      }
    });
    
  } catch (错误) {
    console.log('取件出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 撤销取件
app.put('/api/express/:id/unpick', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const expressId = 请求.params.id;
    
    // 获取快递记录
    const 快递 = await ExpressDelivery.findById(expressId);
    if (!快递) {
      return 响应.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    // 检查权限（必须是取件人才能撤销）
    if (快递.pickerId !== userId) {
      return 响应.status(403).json({
        success: false,
        message: '只有取件人才能撤销'
      });
    }
    
    // 检查状态
    if (快递.status !== 'picked') {
      return 响应.status(400).json({
        success: false,
        message: '该快递未在已取状态'
      });
    }
    
    // 更新状态
    快递.status = 'pending';
    快递.pickerId = null;
    快递.pickedAt = null;
    await 快递.save();
    
    // 通知对方
    const 用户 = await User.findById(userId);
    const 通知对象Id = 快递.requesterId === userId ? 用户.partnerId : 快递.requesterId;
    
    // 获取对方信息（用于显示备注名）
    const 对方 = await User.findById(通知对象Id);
    const 显示名 = 对方?.partnerNote || 用户.nickname;
    
    notifyPartner(通知对象Id, {
      type: 'expressUnpicked',
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        description: 快递.description,
        operator: {
          id: 用户._id,
          nickname: 用户.nickname,
          partnerNote: 用户.partnerNote,
          displayName: 显示名,
          gender: 用户.gender
        }
      }
    });
    
    // 发送 Push 通知（优先使用备注名）
    await notifyPartnerPush(通知对象Id, getPushPayload('expressUnpicked', {
      nickname: 显示名,
      item: 快递.description
    }, { expressId: 快递._id.toString() }));
    
    响应.json({
      success: true,
      message: '撤销成功',
      data: {
        id: 快递._id,
        status: 快递.status,
        pickerId: null,
        pickedAt: null
      }
    });
    
  } catch (错误) {
    console.log('撤销取件出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除快递请求
app.delete('/api/express/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const expressId = 请求.params.id;
    
    // 获取快递记录
    const 快递 = await ExpressDelivery.findById(expressId);
    if (!快递) {
      return 响应.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    // 只有创建者可以删除
    if (快递.requesterId !== userId) {
      return 响应.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }
    
    // 已取的快递不能删除（避免数据不一致）
    if (快递.status === 'picked') {
      return 响应.status(400).json({
        success: false,
        message: '已取件的快递不能删除'
      });
    }
    
    await ExpressDelivery.deleteOne({ _id: expressId });
    
    // 通知对方快递被删除
    const 用户 = await User.findById(userId);
    if (用户 && 用户.partnerId) {
      // WebSocket 实时通知
      notifyPartner(用户.partnerId, {
        type: 'expressDeleted',
        data: {
          id: expressId,
          trackingNo: 快递.trackingNo,
          description: 快递.description
        }
      });
      
      // Push 通知
      await notifyPartnerPush(用户.partnerId, getPushPayload('expressDeleted', {
        item: 快递.description || 快递.trackingNo
      }));
    }
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除快递出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 取件地点 API
// ============================================

// 获取取件地点列表
app.get('/api/pickup-locations', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 查询地点列表
    const 地点列表 = await PickupLocation.find({ coupleId })
      .sort({ createdAt: -1 });
    
    响应.json({
      success: true,
      data: 地点列表.map(loc => ({
        id: loc._id,
        name: loc.name,
        createdBy: loc.createdBy
      }))
    });
    
  } catch (错误) {
    console.log('获取取件地点出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 添加取件地点
app.post('/api/pickup-locations', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { name } = 请求.body;
    
    if (!name || !name.trim()) {
      return 响应.status(400).json({
        success: false,
        message: '地点名称不能为空'
      });
    }
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const 地点名 = name.trim();
    
    // 检查是否已存在
    const 已存在 = await PickupLocation.findOne({ coupleId, name: 地点名 });
    if (已存在) {
      return 响应.status(400).json({
        success: false,
        message: '该地点已存在'
      });
    }
    
    // 创建新地点
    const 新地点 = new PickupLocation({
      coupleId,
      name: 地点名,
      createdBy: userId
    });
    
    await 新地点.save();
    
    响应.json({
      success: true,
      message: '添加成功',
      data: {
        id: 新地点._id,
        name: 新地点.name,
        createdBy: 新地点.createdBy
      }
    });
    
  } catch (错误) {
    console.log('添加取件地点出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 修改取件地点
app.put('/api/pickup-locations/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { name } = 请求.body;
    
    if (!name || !name.trim()) {
      return 响应.status(400).json({
        success: false,
        message: '地点名称不能为空'
      });
    }
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const 新地点名 = name.trim();
    
    // 检查新名称是否已存在（排除当前地点）
    const 已存在 = await PickupLocation.findOne({ 
      coupleId, 
      name: 新地点名,
      _id: { $ne: id }
    });
    if (已存在) {
      return 响应.status(400).json({
        success: false,
        message: '该地点名称已存在'
      });
    }
    
    // 更新地点
    const 地点 = await PickupLocation.findOneAndUpdate(
      { _id: id, coupleId },
      { name: 新地点名 },
      { new: true }
    );
    
    if (!地点) {
      return 响应.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '修改成功',
      data: {
        id: 地点._id,
        name: 地点.name,
        createdBy: 地点.createdBy
      }
    });
    
  } catch (错误) {
    console.log('修改取件地点出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除取件地点
app.delete('/api/pickup-locations/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 删除地点
    const 地点 = await PickupLocation.findOneAndDelete({ _id: id, coupleId });
    
    if (!地点) {
      return 响应.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除取件地点出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 第五部分：WebSocket 实时通信
// ============================================

// 创建一个 Map 来存储所有连接的客户端
// key 是用户ID，value 是 WebSocket 连接
const clients = new Map();

// 创建 WebSocket 服务器
// 从环境变量读取端口
const WS_PORT = process.env.WS_PORT || 3001;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log('WebSocket 服务器将在端口 ' + WS_PORT + ' 启动');

// 当有客户端连接时
wss.on('connection', (ws, req) => {
  console.log('新的 WebSocket 连接');
  
  // 等待客户端发送 token 进行身份验证
  ws.once('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // 验证消息类型
      if (data.type !== 'auth' || !data.token) {
        ws.close(1008, '身份验证失败');
        return;
      }
      
      // 验证 JWT token
      let decoded;
      try {
        decoded = jwt.verify(data.token, JWT_SECRET);
      } catch (jwtError) {
        console.log('WebSocket JWT 验证失败:', jwtError.message);
        ws.close(1008, '身份验证失败');
        return;
      }
      
      const userId = decoded.userId;
      
      // 获取用户信息（包括 partnerId）
      const 用户 = await User.findById(userId);
      if (!用户) {
        ws.close(1008, '用户不存在');
        return;
      }
      
      // 保存用户连接
      ws.userId = userId;
      ws.partnerId = 用户.partnerId || null;
      clients.set(userId, ws);
      
      console.log(`用户 ${userId} 已连接 WebSocket`);
      
      // 发送连接成功消息
      ws.send(JSON.stringify({
        type: 'connected',
        message: '连接成功'
      }));
      
      // 监听消息
      ws.on('message', (msg) => {
        try {
          const msgData = JSON.parse(msg);
          handleWebSocketMessage(ws, msgData);
        } catch (e) {
          console.log('WebSocket 消息解析失败:', e);
        }
      });
      
      // 监听断开连接
      ws.on('close', () => {
        console.log(`用户 ${ws.userId} 断开 WebSocket 连接`);
        clients.delete(ws.userId);
      });
      
      // 监听错误
      ws.on('error', (error) => {
        console.log('WebSocket 错误:', error);
      });
      
    } catch (e) {
      console.log('WebSocket 首次消息解析失败:', e);
      ws.close(1008, '无效的消息格式');
    }
  });
  
  // 5秒后如果没有收到身份验证，关闭连接
  setTimeout(() => {
    if (!ws.userId) {
      ws.close(1008, '身份验证超时');
    }
  }, 5000);
});

// 处理 WebSocket 消息
function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      // 心跳检测
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'update':
      // 用户更新了资料，通知伴侣
      if (ws.partnerId) {
        notifyPartner(ws.partnerId, {
          type: 'partnerUpdated',
          data: data.data
        });
      }
      break;
      
    default:
      console.log('未知的 WebSocket 消息类型:', data.type);
  }
}

// 通知伴侣
function notifyPartner(partnerId, message) {
  // 将 ObjectId 转为字符串，确保与 clients map 的 key 类型一致
  const partnerIdStr = partnerId.toString();
  const partnerWs = clients.get(partnerIdStr);
  if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
    partnerWs.send(JSON.stringify(message));
    console.log(`已通知伴侣 ${partnerId}`);
  } else {
    console.log(`伴侣 ${partnerId} 不在线`);
  }
}

// 广播消息给所有连接的客户端（用于系统通知）
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 导出通知函数，供其他接口使用
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
