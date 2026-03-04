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
// 相册照片 Schema
// ============================================
const photoSchema = new mongoose.Schema({
  // 关联信息
  coupleId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  
  // 照片信息
  url: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  caption: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  
  // 宽高比，用于瀑布流计算（width/height）
  aspectRatio: {
    type: Number,
    default: 1
  },
  
  // 照片类型：normal(普通) / travel(旅行) / food(美食)
  type: {
    type: String,
    enum: ['normal', 'travel', 'food'],
    default: 'normal'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引：按 coupleId 和 date 查询
photoSchema.index({ coupleId: 1, date: -1 });

const Photo = mongoose.model('Photo', photoSchema);

// ============================================
// 旅行记录 Schema
// ============================================
const travelSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: '中国'
  },
  date: {
    type: Date,
    required: true
  },
  photos: [{
    type: String
  }],
  memory: {
    type: String,
    default: ''
  },
  highlights: [{
    type: String
  }],
  weather: {
    type: String,
    default: ''
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

travelSchema.index({ coupleId: 1, date: -1 });

const Travel = mongoose.model('Travel', travelSchema);

// ============================================
// 美食记录 Schema
// ============================================
const foodSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  restaurant: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  whatWeAte: [{
    type: String
  }],
  howWasIt: {
    type: String,
    default: ''
  },
  wantToGoAgain: {
    type: Boolean,
    default: false
  },
  isOurFavorite: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    default: ''
  },
  photos: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

foodSchema.index({ coupleId: 1, date: -1 });

const Food = mongoose.model('Food', foodSchema);

// ============================================
// 想吃清单 Schema
// ============================================
const foodWishSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  restaurant: {
    type: String,
    required: true
  },
  whyWeWant: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FoodWish = mongoose.model('FoodWish', foodWishSchema);

// ============================================
// 坚持计划 Schema - 通用版本
// ============================================
const planSchema = new mongoose.Schema({
  // 关联信息
  coupleId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  
  // 计划类型：personal(个人计划) / shared(共同计划)
  // personal: 只有创建者可以打卡
  // shared: 双方都可以打卡
  planType: {
    type: String,
    enum: ['personal', 'shared'],
    default: 'personal'
  },
  
  // 计划分类：用户自定义，不限定枚举
  // 内置类型：study(学习) / health(健康) / fitness(运动) / hobby(爱好) / save(存钱) / custom(自定义)
  type: {
    type: String,
    default: 'custom'
  },
  
  // 计划标题
  title: {
    type: String,
    required: true
  },
  
  // 描述
  description: {
    type: String,
    default: ''
  },
  
  // 目标描述
  target: {
    type: String,
    default: ''
  },
  
  // 计量单位（如：kg、分钟、页、元）
  unit: {
    type: String,
    default: ''
  },
  
  // 起始值
  initialValue: {
    type: Number,
    default: null
  },
  
  // 目标值
  targetValue: {
    type: Number,
    default: null
  },
  
  // 是否需要数值记录
  hasValue: {
    type: Boolean,
    default: false
  },
  
  // 是否需要时长记录
  hasDuration: {
    type: Boolean,
    default: false
  },
  
  // 开始日期
  startDate: {
    type: Date,
    required: true
  },
  
  // 结束日期（可选）
  endDate: {
    type: Date,
    default: null
  },
  
  // 颜色标识
  color: {
    type: String,
    default: '#4CAF50'
  },
  
  // 图标（emoji 或名称）
  icon: {
    type: String,
    default: '📝'
  },
  
  // 子任务列表
  subTasks: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    repeatDays: [{
      type: Number,
      min: 0,
      max: 6
    }]
  }],
  
  // 重复日期 [0-6]，0=周日，空数组表示每天
  repeatDays: [{
    type: Number,
    min: 0,
    max: 6
  }],
  
  // 提醒时间 HH:mm
  reminderTime: {
    type: String,
    default: null
  },
  
  // 状态：active(进行中) / paused(暂停) / completed(已完成)
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  
  // 提醒时间（HH:mm格式）
  reminderTime: {
    type: String,
    default: null
  },
  
  // AI 建议/分析缓存
  aiAnalysis: {
    type: String,
    default: ''
  },
  
  aiAnalysisUpdatedAt: {
    type: Date,
    default: null
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

planSchema.index({ coupleId: 1, userId: 1 });
planSchema.index({ coupleId: 1, type: 1 });

const Plan = mongoose.model('Plan', planSchema);

// ============================================
// 打卡记录 Schema - 通用版本
// ============================================
const checkInSchema = new mongoose.Schema({
  // 关联的计划ID
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  
  // 打卡用户ID
  userId: {
    type: String,
    required: true
  },
  
  // 情侣ID
  coupleId: {
    type: String,
    required: true
  },
  
  // 打卡日期
  date: {
    type: Date,
    required: true
  },
  
  // 打卡内容/备注
  content: {
    type: String,
    default: ''
  },
  
  // 通用数值记录（体重、学习页数、存款金额等）
  value: {
    type: Number,
    default: null
  },
  
  // 时长记录（分钟）
  duration: {
    type: Number,
    default: null
  },
  
  // 活动内容描述
  activity: {
    type: String,
    default: ''
  },
  
  // 完成度（0-100）
  completion: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  
  // 心情/感受
  mood: {
    type: String,
    enum: ['great', 'good', 'normal', 'tired', 'bad'],
    default: 'good'
  },
  
  // 已完成的子任务ID列表
  completedSubTasks: [{
    type: String
  }],
  
  // 打卡时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

checkInSchema.index({ planId: 1, date: -1 });
checkInSchema.index({ coupleId: 1, userId: 1, date: -1 });
// 每天每个计划只能打卡一次
checkInSchema.index({ planId: 1, userId: 1, date: 1 }, { unique: true });

const CheckIn = mongoose.model('CheckIn', checkInSchema);

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
    
    // 根据优先级选择通知类型
    const isUrgent = 快递.priority === 'urgent';
    const notificationType = isUrgent ? 'expressNewUrgent' : 'expressNew';
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: notificationType,
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        pickupLocation: 快递.pickupLocation,
        description: 快递.description,
        priority: 快递.priority,
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
    await notifyPartnerPush(用户.partnerId, getPushPayload(notificationType, {
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
    const 是否取自己的快递 = 快递.requesterId === userId;
    
    // 获取对方信息（用于显示备注名）
    const 对方 = await User.findById(通知对象Id);
    const 显示名 = 对方?.partnerNote || 用户.nickname;
    
    // 根据是否取自己的快递选择通知类型
    const 通知类型 = 是否取自己的快递 ? 'expressPickedSelf' : 'expressPicked';
    
    notifyPartner(通知对象Id, {
      type: 通知类型,
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
    await notifyPartnerPush(通知对象Id, getPushPayload(通知类型, {
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

// 编辑快递请求
app.put('/api/express/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const expressId = 请求.params.id;
    const { trackingNo, pickupLocation, description, priority } = 请求.body;
    
    // 获取快递记录
    const 快递 = await ExpressDelivery.findById(expressId);
    if (!快递) {
      return 响应.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    // 只有创建者可以编辑
    if (快递.requesterId !== userId) {
      return 响应.status(403).json({
        success: false,
        message: '只有创建者才能编辑'
      });
    }
    
    // 已取的快递不能编辑
    if (快递.status === 'picked') {
      return 响应.status(400).json({
        success: false,
        message: '已取件的快递不能编辑'
      });
    }
    
    // 更新字段
    if (trackingNo !== undefined) 快递.trackingNo = trackingNo.trim();
    if (pickupLocation !== undefined) 快递.pickupLocation = pickupLocation.trim();
    if (description !== undefined) 快递.description = description.trim();
    if (priority !== undefined) 快递.priority = priority === 'urgent' ? 'urgent' : 'normal';
    
    await 快递.save();
    
    响应.json({
      success: true,
      message: '修改成功',
      data: {
        id: 快递._id,
        trackingNo: 快递.trackingNo,
        pickupLocation: 快递.pickupLocation,
        description: 快递.description,
        priority: 快递.priority,
        status: 快递.status,
        requesterId: 快递.requesterId,
        pickerId: 快递.pickerId,
        createdAt: 快递.createdAt
      }
    });
    
  } catch (错误) {
    console.log('编辑快递出错：', 错误);
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
// 相册 API
// ============================================

// 通用文件上传（用于相册等）
app.post('/api/upload', authMiddleware, upload.single('file'), async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    // 检查是否有文件
    if (!请求.file) {
      return 响应.status(400).json({
        success: false,
        message: '请选择要上传的文件'
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
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(请求.file.mimetype)) {
      return 响应.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP、HEIC 格式的图片'
      });
    }
    
    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (请求.file.size > maxSize) {
      return 响应.status(400).json({
        success: false,
        message: '图片大小不能超过 10MB'
      });
    }
    
    // 上传文件到存储服务
    const filePath = await storageService.upload(
      请求.file.buffer,
      'photo',
      userId,
      用户.partnerId,
      请求.file.originalname,
      { nickname: 用户.nickname }
    );
    
    // 获取访问 URL
    const baseUrl = `${请求.protocol}://${请求.get('host')}`;
    const fileUrl = await storageService.getUrl(filePath, 3600, baseUrl);
    
    响应.json({
      success: true,
      message: '上传成功',
      data: {
        path: filePath,
        url: fileUrl
      }
    });
    
  } catch (错误) {
    console.log('文件上传出错:', 错误);
    响应.status(500).json({
      success: false,
      message: '上传失败，请重试'
    });
  }
});

// 获取照片列表
app.get('/api/photos', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { type } = 请求.query;
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 获取伴侣信息（用于显示性别）
    const 伴侣 = await User.findById(用户.partnerId);
    const partnerGender = 伴侣?.gender || 'other';
    const partnerPronoun = getPronoun(partnerGender);  // 他/她
    
    // 构建查询条件
    const query = { coupleId };
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // 查询照片列表
    const 照片列表 = await Photo.find(query).sort({ date: -1, createdAt: -1 });
    
    响应.json({
      success: true,
      data: 照片列表
    });
    
  } catch (错误) {
    console.log('获取照片列表出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 上传照片
app.post('/api/photos', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { url, date, caption, tags, aspectRatio, type } = 请求.body;
    
    if (!url) {
      return 响应.status(400).json({
        success: false,
        message: '照片URL不能为空'
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
    
    // 创建照片记录
    const 照片 = new Photo({
      coupleId,
      uploadedBy: userId,
      url,
      date: date || new Date(),
      caption: caption || '',
      tags: tags || [],
      aspectRatio: aspectRatio || 1,
      type: type || 'normal'
    });
    
    await 照片.save();
    
    // 通知对方有新照片
    notifyPartner(用户.partnerId, {
      type: 'photoUploaded',
      data: {
        id: 照片._id,
        url: 照片.url,
        caption: 照片.caption,
        type: 照片.type
      }
    });
    
    响应.json({
      success: true,
      message: '上传成功',
      data: 照片
    });
    
  } catch (错误) {
    console.log('上传照片出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新照片信息
app.put('/api/photos/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { caption, tags, type, date } = 请求.body;
    
    // 获取用户信息
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 查找并更新照片
    const 照片 = await Photo.findOneAndUpdate(
      { _id: id, coupleId },
      { 
        $set: { 
          caption: caption !== undefined ? caption : undefined,
          tags: tags !== undefined ? tags : undefined,
          type: type !== undefined ? type : undefined,
          date: date !== undefined ? date : undefined
        }
      },
      { new: true }
    );
    
    if (!照片) {
      return 响应.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '更新成功',
      data: 照片
    });
    
  } catch (错误) {
    console.log('更新照片出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除照片
app.delete('/api/photos/:id', authMiddleware, async (请求, 响应) => {
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
    
    // 删除照片
    const 照片 = await Photo.findOneAndDelete({ _id: id, coupleId });
    
    if (!照片) {
      return 响应.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }
    
    // 通知对方照片被删除
    notifyPartner(用户.partnerId, {
      type: 'photoDeleted',
      data: {
        id: id
      }
    });
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除照片出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 旅行护照 API
// ============================================

// 获取旅行记录列表
app.get('/api/travels', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const travels = await Travel.find({ coupleId }).sort({ date: -1 });
    
    响应.json({
      success: true,
      data: travels
    });
    
  } catch (错误) {
    console.log('获取旅行记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 创建旅行记录
app.post('/api/travels', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { city, country, date, photos, memory, highlights, weather, isFavorite } = 请求.body;
    
    if (!city || !date) {
      return 响应.status(400).json({
        success: false,
        message: '城市和日期不能为空'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const travel = new Travel({
      coupleId,
      createdBy: userId,
      city,
      country: country || '中国',
      date,
      photos: photos || [],
      memory: memory || '',
      highlights: highlights || [],
      weather: weather || '',
      isFavorite: isFavorite || false
    });
    
    await travel.save();
    
    notifyPartner(用户.partnerId, {
      type: 'travelAdded',
      data: {
        id: travel._id,
        city,
        photos: photos?.[0]
      }
    });
    
    响应.json({
      success: true,
      message: '旅行记录添加成功',
      data: travel
    });
    
  } catch (错误) {
    console.log('添加旅行记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新旅行记录
app.put('/api/travels/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const updateData = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const travel = await Travel.findOneAndUpdate(
      { _id: id, coupleId },
      { $set: updateData },
      { new: true }
    );
    
    if (!travel) {
      return 响应.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '更新成功',
      data: travel
    });
    
  } catch (错误) {
    console.log('更新旅行记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除旅行记录
app.delete('/api/travels/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const travel = await Travel.findOneAndDelete({ _id: id, coupleId });
    
    if (!travel) {
      return 响应.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除旅行记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 美食手账 API
// ============================================

// 获取美食记录列表
app.get('/api/foods', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const foods = await Food.find({ coupleId }).sort({ date: -1 });
    
    响应.json({
      success: true,
      data: foods
    });
    
  } catch (错误) {
    console.log('获取美食记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 创建美食记录
app.post('/api/foods', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { restaurant, date, whatWeAte, howWasIt, wantToGoAgain, isOurFavorite, location, photos } = 请求.body;
    
    if (!restaurant || !date) {
      return 响应.status(400).json({
        success: false,
        message: '餐厅名和日期不能为空'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const food = new Food({
      coupleId,
      createdBy: userId,
      restaurant,
      date,
      whatWeAte: whatWeAte || [],
      howWasIt: howWasIt || '',
      wantToGoAgain: wantToGoAgain || false,
      isOurFavorite: isOurFavorite || false,
      location: location || '',
      photos: photos || []
    });
    
    await food.save();
    
    notifyPartner(用户.partnerId, {
      type: 'foodAdded',
      data: {
        id: food._id,
        restaurant,
        photos: photos?.[0]
      }
    });
    
    响应.json({
      success: true,
      message: '美食记录添加成功',
      data: food
    });
    
  } catch (错误) {
    console.log('添加美食记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新美食记录
app.put('/api/foods/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const updateData = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const food = await Food.findOneAndUpdate(
      { _id: id, coupleId },
      { $set: updateData },
      { new: true }
    );
    
    if (!food) {
      return 响应.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '更新成功',
      data: food
    });
    
  } catch (错误) {
    console.log('更新美食记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除美食记录
app.delete('/api/foods/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const food = await Food.findOneAndDelete({ _id: id, coupleId });
    
    if (!food) {
      return 响应.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除美食记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 想吃清单 API
// ============================================

// 获取想吃清单
app.get('/api/food-wishes', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    const wishes = await FoodWish.find({ coupleId }).sort({ createdAt: -1 });
    
    响应.json({
      success: true,
      data: wishes
    });
    
  } catch (错误) {
    console.log('获取想吃清单出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 添加想吃
app.post('/api/food-wishes', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { restaurant, whyWeWant } = 请求.body;
    
    if (!restaurant) {
      return 响应.status(400).json({
        success: false,
        message: '餐厅名不能为空'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const wish = new FoodWish({
      coupleId,
      createdBy: userId,
      restaurant,
      whyWeWant: whyWeWant || ''
    });
    
    await wish.save();
    
    响应.json({
      success: true,
      message: '添加成功',
      data: wish
    });
    
  } catch (错误) {
    console.log('添加想吃清单出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除想吃
app.delete('/api/food-wishes/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    await FoodWish.findOneAndDelete({ _id: id, coupleId });
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除想吃清单出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 坚持计划 API
// ============================================

// 获取计划列表
app.get('/api/plans', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { type } = 请求.query;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 构建查询条件
    const query = { coupleId };
    if (type) {
      query.type = type;
    }
    
    const plans = await Plan.find(query).sort({ createdAt: -1 });
    
    // 获取每个计划的打卡统计
    const plansWithStats = await Promise.all(plans.map(async (plan) => {
      const checkIns = await CheckIn.find({ planId: plan._id });
      const myCheckIns = checkIns.filter(c => c.userId === userId);
      const partnerCheckIns = checkIns.filter(c => c.userId === 用户.partnerId);
      
      // 计算连续打卡天数
      const calculateStreak = (records) => {
        if (records.length === 0) return 0;
        const sorted = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const record of sorted) {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === streak) {
            streak++;
          } else if (diffDays > streak) {
            break;
          }
        }
        return streak;
      };
      
      // 获取最新体重（减肥计划）
      let latestWeight = null;
      if (plan.type === 'weight') {
        const latestCheckIn = checkIns
          .filter(c => c.data.weight)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latestCheckIn) {
          latestWeight = latestCheckIn.data.weight;
        }
      }
      
      // 根据计划类型返回不同的统计
      let stats;
      // 比较用户ID，处理 ObjectId 和 string 的情况
      const planUserIdStr = plan.userId.toString();
      const requestUserIdStr = userId.toString ? userId.toString() : userId;
      const isMyPlan = planUserIdStr === requestUserIdStr;
      
      // 调试日志
      console.log('[Plans] Plan:', plan.title, 'plan.userId:', planUserIdStr, 'request.userId:', requestUserIdStr, 'isMyPlan:', isMyPlan);
      
      if (plan.planType === 'personal') {
        // 个人计划：只显示创建者的打卡
        const relevantCheckIns = isMyPlan ? myCheckIns : partnerCheckIns;
        stats = {
          checkIns: relevantCheckIns.length,
          streak: calculateStreak(relevantCheckIns),
          latestWeight,
          isMyPlan,  // 标记是否是我的计划
          ownerLabel: isMyPlan ? '我的' : `${partnerPronoun}的`  // 我的/他的/她的
        };
      } else {
        // 共同计划：显示双方的打卡
        stats = {
          myCheckIns: myCheckIns.length,
          partnerCheckIns: partnerCheckIns.length,
          totalCheckIns: checkIns.length,
          myStreak: calculateStreak(myCheckIns),
          partnerStreak: calculateStreak(partnerCheckIns),
          latestWeight,
          isMyPlan: true,  // 共同计划双方都可以打卡
          ownerLabel: '共同'
        };
      }
      
      return {
        ...plan.toObject(),
        stats
      };
    }));
    
    响应.json({
      success: true,
      data: plansWithStats
    });
    
  } catch (错误) {
    console.log('获取计划列表出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取计划模板
app.get('/api/plans/templates', authMiddleware, async (请求, 响应) => {
  const templates = [
    {
      key: 'study',
      name: '学习提升',
      icon: '📚',
      color: '#2196F3',
      examples: ['考研复习', '英语单词', '编程学习', '阅读书籍'],
      hasValue: true,
      hasDuration: true,
      unit: '分钟',
      unitOptions: ['分钟', '页', '题', '章', '个']
    },
    {
      key: 'health',
      name: '健康管理',
      icon: '❤️',
      color: '#FF5722',
      examples: ['减重计划', '早起打卡', '喝水记录', '控糖饮食'],
      hasValue: true,
      hasDuration: false,
      unit: 'kg',
      unitOptions: ['kg', '斤', '毫升', '杯', '次']
    },
    {
      key: 'fitness',
      name: '运动健身',
      icon: '💪',
      color: '#4CAF50',
      examples: ['跑步', '力量训练', '瑜伽', '游泳'],
      hasValue: true,
      hasDuration: true,
      unit: '分钟',
      unitOptions: ['分钟', 'km', '米', '次', '组']
    },
    {
      key: 'hobby',
      name: '兴趣养成',
      icon: '🎨',
      color: '#9C27B0',
      examples: ['练琴', '绘画', '写作', '摄影'],
      hasValue: false,
      hasDuration: true,
      unit: '分钟',
      unitOptions: ['分钟', '小时', '次', '张', '首']
    },
    {
      key: 'save',
      name: '存钱理财',
      icon: '💰',
      color: '#FF9800',
      examples: ['365天存钱', '月度预算', '投资理财'],
      hasValue: true,
      hasDuration: false,
      unit: '元',
      unitOptions: ['元', '美元', '笔', '次']
    },
    {
      key: 'custom',
      name: '自定义',
      icon: '📝',
      color: '#607D8B',
      examples: ['任何你想坚持的事情'],
      hasValue: true,
      hasDuration: true,
      unit: '',
      unitOptions: ['次', '个', '分钟', '天', '页']
    }
  ];
  
  响应.json({
    success: true,
    data: templates
  });
});

// 创建计划 - 通用版本
app.post('/api/plans', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { 
      type, title, description, target, unit,
      initialValue, targetValue, hasValue, hasDuration,
      startDate, endDate, color, icon, reminderTime, planType,
      subTasks, repeatDays
    } = 请求.body;
    
    if (!title || !startDate) {
      return 响应.status(400).json({
        success: false,
        message: '标题和开始日期不能为空'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const plan = new Plan({
      coupleId,
      userId,
      planType: planType || 'personal',  // personal 或 shared
      type: type || 'custom',
      title,
      description: description || '',
      target: target || '',
      unit: unit || '',
      initialValue: initialValue || null,
      targetValue: targetValue || null,
      hasValue: hasValue || false,
      hasDuration: hasDuration || false,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      color: color || '#4CAF50',
      icon: icon || '📝',
      reminderTime: reminderTime || null,
      subTasks: subTasks || [],
      repeatDays: repeatDays || []
    });
    
    await plan.save();
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: 'planCreated',
      data: {
        id: plan._id,
        title: plan.title,
        type: plan.type,
        by: {
          id: 用户._id,
          nickname: 用户.nickname
        }
      }
    });
    
    响应.json({
      success: true,
      message: '计划创建成功',
      data: plan
    });
    
  } catch (错误) {
    console.log('创建计划出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新计划
app.put('/api/plans/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const updateData = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 只允许创建者或情侣成员修改
    const plan = await Plan.findOne({ _id: id, coupleId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在'
      });
    }
    
    // 更新字段
    const allowedFields = ['title', 'description', 'target', 'initialValue', 'targetValue', 
                          'startDate', 'endDate', 'color', 'icon', 'status', 'reminderTime'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate') {
          plan[field] = new Date(updateData[field]);
        } else {
          plan[field] = updateData[field];
        }
      }
    });
    
    plan.updatedAt = new Date();
    await plan.save();
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: 'planUpdated',
      data: {
        id: plan._id,
        title: plan.title,
        status: plan.status,
        by: {
          id: 用户._id,
          nickname: 用户.nickname
        }
      }
    });
    
    响应.json({
      success: true,
      message: '更新成功',
      data: plan
    });
    
  } catch (错误) {
    console.log('更新计划出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除计划
app.delete('/api/plans/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 只有创建者可以删除
    const plan = await Plan.findOneAndDelete({ _id: id, coupleId, userId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在或无权限删除'
      });
    }
    
    // 删除相关打卡记录
    await CheckIn.deleteMany({ planId: id });
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: 'planDeleted',
      data: {
        id: id,
        title: plan.title,
        by: {
          id: 用户._id,
          nickname: 用户.nickname
        }
      }
    });
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除计划出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取打卡记录
app.get('/api/plans/:id/checkins', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { startDate, endDate } = 请求.query;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 验证计划是否存在且属于该情侣
    const plan = await Plan.findOne({ _id: id, coupleId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在'
      });
    }
    
    // 构建查询条件
    const query = { planId: id, coupleId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const checkIns = await CheckIn.find(query)
      .sort({ date: -1 })
      .limit(100);
    
    // 获取用户信息
    const userIds = [...new Set(checkIns.map(c => c.userId))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = {
        id: u._id,
        nickname: u.nickname,
        avatar: u.avatar
      };
    });
    
    const result = checkIns.map(c => ({
      ...c.toObject(),
      user: userMap[c.userId] || null
    }));
    
    响应.json({
      success: true,
      data: result
    });
    
  } catch (错误) {
    console.log('获取打卡记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 打卡
app.post('/api/plans/:id/checkin', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { date, content, data, mood } = 请求.body;
    
    if (!date) {
      return 响应.status(400).json({
        success: false,
        message: '打卡日期不能为空'
      });
    }
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 验证计划是否存在且属于该情侣
    const plan = await Plan.findOne({ _id: id, coupleId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在'
      });
    }
    
    // 验证打卡权限
    // 个人计划：只有创建者可以打卡
    // 共同计划：双方都可以打卡
    if (plan.planType === 'personal' && plan.userId !== userId) {
      return 响应.status(403).json({
        success: false,
        message: '这是对方的个人计划，你无法打卡'
      });
    }
    
    // 检查今天是否已打卡
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await CheckIn.findOne({
      planId: id,
      userId,
      date: {
        $gte: checkDate,
        $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingCheckIn) {
      return 响应.status(400).json({
        success: false,
        message: '今天已经打卡了，可以编辑原有记录'
      });
    }
    
    const checkIn = new CheckIn({
      planId: id,
      userId,
      coupleId,
      date: checkDate,
      content: content || '',
      value: data?.value || null,
      duration: data?.duration || null,
      activity: data?.activity || '',
      completion: data?.completion || 100,
      mood: mood || 'good',
      completedSubTasks: data?.completedSubTasks || []
    });
    
    await checkIn.save();
    
    // 更新计划中子任务的完成状态
    if (data?.completedSubTasks && data.completedSubTasks.length > 0 && plan.subTasks) {
      plan.subTasks = plan.subTasks.map(task => {
        if (data.completedSubTasks.includes(task.id)) {
          return { ...task, completed: true };
        }
        return task;
      });
      await plan.save();
    }
    
    // 通知伴侣
    notifyPartner(用户.partnerId, {
      type: 'planCheckIn',
      data: {
        planId: id,
        planTitle: plan.title,
        planType: plan.type,
        checkIn: {
          id: checkIn._id,
          date: checkIn.date,
          content: checkIn.content,
          value: checkIn.value,
          duration: checkIn.duration,
          activity: checkIn.activity,
          completion: checkIn.completion,
          mood: checkIn.mood
        },
        by: {
          id: 用户._id,
          nickname: 用户.nickname
        }
      }
    });
    
    响应.json({
      success: true,
      message: '打卡成功',
      data: checkIn
    });
    
  } catch (错误) {
    console.log('打卡出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 更新打卡记录
app.put('/api/checkins/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { content, data, mood } = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const checkIn = await CheckIn.findOne({ _id: id, coupleId, userId });
    if (!checkIn) {
      return 响应.status(404).json({
        success: false,
        message: '打卡记录不存在'
      });
    }
    
    if (content !== undefined) checkIn.content = content;
    if (data !== undefined) {
      checkIn.data = {
        ...checkIn.data,
        ...data
      };
    }
    if (mood !== undefined) checkIn.mood = mood;
    
    await checkIn.save();
    
    响应.json({
      success: true,
      message: '更新成功',
      data: checkIn
    });
    
  } catch (错误) {
    console.log('更新打卡记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 删除打卡记录
app.delete('/api/checkins/:id', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    const checkIn = await CheckIn.findOneAndDelete({ _id: id, coupleId, userId });
    if (!checkIn) {
      return 响应.status(404).json({
        success: false,
        message: '打卡记录不存在'
      });
    }
    
    响应.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (错误) {
    console.log('删除打卡记录出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取今日打卡状态
app.get('/api/plans/today/status', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.json({
        success: true,
        data: { checkedInPlans: [], pendingPlans: [] }
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 获取所有进行中的计划
    const plans = await Plan.find({ coupleId, status: 'active' });
    
    // 获取今日打卡记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const todayCheckIns = await CheckIn.find({
      coupleId,
      userId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    const checkedInPlanIds = todayCheckIns.map(c => c.planId.toString());
    
    const checkedInPlans = plans.filter(p => checkedInPlanIds.includes(p._id.toString()));
    const pendingPlans = plans.filter(p => !checkedInPlanIds.includes(p._id.toString()));
    
    响应.json({
      success: true,
      data: {
        checkedInPlans: checkedInPlans.map(p => ({
          id: p._id,
          title: p.title,
          type: p.type,
          color: p.color,
          icon: p.icon,
          subTasks: p.subTasks || []
        })),
        pendingPlans: pendingPlans.map(p => ({
          id: p._id,
          title: p.title,
          type: p.type,
          color: p.color,
          icon: p.icon,
          subTasks: p.subTasks || []
        }))
      }
    });
    
  } catch (错误) {
    console.log('获取今日打卡状态出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取统计数据
app.get('/api/plans/stats/overview', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.json({
        success: true,
        data: {
          myStats: { totalPlans: 0, totalCheckIns: 0, currentStreak: 0 },
          partnerStats: { totalPlans: 0, totalCheckIns: 0, currentStreak: 0 }
        }
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 我的统计
    const myPlans = await Plan.find({ coupleId, userId });
    const myCheckIns = await CheckIn.find({ coupleId, userId });
    
    // 伴侣的统计
    const partnerPlans = await Plan.find({ coupleId, userId: 用户.partnerId });
    const partnerCheckIns = await CheckIn.find({ coupleId, userId: 用户.partnerId });
    
    // 计算连续打卡天数
    const calculateStreak = (records) => {
      if (records.length === 0) return 0;
      const sorted = [...new Set(records.map(r => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }))].sort((a, b) => b - a);
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const timestamp of sorted) {
        const diffDays = Math.floor((today.getTime() - timestamp) / (1000 * 60 * 60 * 24));
        if (diffDays === streak) {
          streak++;
        } else if (diffDays > streak) {
          break;
        }
      }
      return streak;
    };
    
    响应.json({
      success: true,
      data: {
        myStats: {
          totalPlans: myPlans.length,
          activePlans: myPlans.filter(p => p.status === 'active').length,
          totalCheckIns: myCheckIns.length,
          currentStreak: calculateStreak(myCheckIns)
        },
        partnerStats: {
          totalPlans: partnerPlans.length,
          activePlans: partnerPlans.filter(p => p.status === 'active').length,
          totalCheckIns: partnerCheckIns.length,
          currentStreak: calculateStreak(partnerCheckIns)
        }
      }
    });
    
  } catch (错误) {
    console.log('获取统计数据出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// DeepSeek AI 分析接口
// ============================================

// AI 智能调整计划
app.post('/api/plans/:id/ai-adjustment', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 获取计划详情
    const plan = await Plan.findOne({ _id: id, coupleId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在'
      });
    }
    
    // 获取打卡记录
    const checkIns = await CheckIn.find({ planId: id, coupleId })
      .sort({ date: -1 })
      .limit(30);
    
    // 计算统计数据
    const totalDays = Math.floor((Date.now() - new Date(plan.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const checkInCount = checkIns.length;
    const completionRate = Math.round((checkInCount / Math.max(1, totalDays)) * 100);
    
    // 平均数值
    let avgValue = null;
    let avgDuration = null;
    const values = checkIns.filter(c => c.value !== null && c.value !== undefined).map(c => c.value);
    const durations = checkIns.filter(c => c.duration).map(c => c.duration);
    if (values.length > 0) avgValue = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    if (durations.length > 0) avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    
    // 最近7天打卡情况
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const hasCheckIn = checkIns.some(c => {
        const cDate = new Date(c.date);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === d.getTime();
      });
      last7Days.push(hasCheckIn ? '✓' : '✗');
    }
    
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    // 获取当前日期
    const today = new Date().toLocaleDateString('zh-CN');
    
    // 构建 AI 提示词
    const prompt = `作为智能计划调整助手，请分析以下坚持计划数据并给出具体的调整建议。

当前日期：${today}

计划信息：
- 标题：${plan.title}
- 目标：${plan.target || '未设置'}${plan.targetValue ? ` (目标值: ${plan.targetValue}${plan.unit || ''})` : ''}
- 开始日期：${new Date(plan.startDate).toLocaleDateString('zh-CN')}
- 已坚持：${totalDays}天
- 打卡次数：${checkInCount}次
- 完成率：${completionRate}%
- 最近7天打卡情况：${last7Days.join(' ')} （✓表示打卡，✗表示未打卡）
${avgValue ? `- 平均数值：${avgValue}${plan.unit || ''}` : ''}
${avgDuration ? `- 平均时长：${avgDuration}分钟` : ''}

请给出以下JSON格式的回复：
{
  "analysis": "简要分析当前进度和存在的问题",
  "suggestion": "具体的改进建议和鼓励话语",
  "adjustments": [
    { "field": "目标值/每日时长/计划状态/提醒时间", "value": "建议的新值", "urgent": true/false }
  ]
}

注意：
- 如果计划刚开始（不足7天），不要误判为"7天未打卡"
- 如果今天是计划开始第一天且未打卡，这是正常的，不要过度批评
- 如果计划进展顺利，adjustments可以为空
- 如果进度落后，给出具体的调整建议`;

    let aiResult;
    
    if (!DEEPSEEK_API_KEY) {
      // 模拟数据
      aiResult = {
        analysis: `目前完成率为${completionRate}%，${completionRate >= 70 ? '整体进展不错！' : '进度稍显落后，建议适当调整目标。'}`,
        suggestion: completionRate >= 70 
          ? '保持良好的节奏！建议继续保持当前强度，适当奖励自己。' 
          : '不要气馁！建议适当降低目标难度，先养成习惯再逐步提高。',
        adjustments: completionRate < 50 && plan.targetValue 
          ? [{ field: '目标值', value: Math.round(plan.targetValue * 0.8) + (plan.unit || ''), urgent: true }]
          : []
      };
    } else {
      try {
        const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是一个专业的计划调整助手，善于根据数据分析给出具体可执行的调整建议。只返回JSON格式。' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 800
          })
        });
        
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || '{}';
        
        // 提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
        
      } catch (aiError) {
        console.log('DeepSeek API 调用失败:', aiError.message);
        aiResult = {
          analysis: 'AI服务暂时不可用，基于本地数据分析：',
          suggestion: completionRate >= 70 ? '进展不错，继续保持！' : '建议适当调整目标，循序渐进。',
          adjustments: []
        };
      }
    }
    
    // 缓存调整建议
    plan.aiAdjustment = aiResult.suggestion;
    await plan.save();
    
    响应.json({
      success: true,
      data: aiResult
    });
    
  } catch (错误) {
    console.log('AI 调整分析出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 获取计划的 AI 分析和建议
app.post('/api/plans/:id/ai-analysis', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { id } = 请求.params;
    const { question } = 请求.body;
    
    const 用户 = await User.findById(userId);
    if (!用户 || !用户.partnerId) {
      return 响应.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, 用户.partnerId].sort().join('_');
    
    // 获取计划详情
    const plan = await Plan.findOne({ _id: id, coupleId });
    if (!plan) {
      return 响应.status(404).json({
        success: false,
        message: '计划不存在'
      });
    }
    
    // 获取打卡记录
    const checkIns = await CheckIn.find({ planId: id, coupleId })
      .sort({ date: -1 })
      .limit(30);
    
    // 构建 AI 提示词
    const today = new Date().toLocaleDateString('zh-CN');
    const checkInSummary = checkIns.map(c => {
      const date = new Date(c.date).toLocaleDateString('zh-CN');
      let detail = '';
      if (c.value !== null && c.value !== undefined) detail += ` 数值:${c.value}`;
      if (c.duration) detail += ` 时长:${c.duration}分钟`;
      if (c.activity) detail += ` 内容:${c.activity}`;
      if (c.mood) detail += ` 心情:${c.mood}`;
      return `${date}:${detail}`;
    }).join('\n');
    
    const prompt = `你是一个专业的习惯养成和目标管理教练。请分析以下坚持计划数据，给出个性化建议。

当前日期：${today}

计划信息：
- 标题：${plan.title}
- 类型：${plan.type}
- 目标：${plan.target || '未设置'}
- 单位：${plan.unit || '无'}
- 开始日期：${new Date(plan.startDate).toLocaleDateString('zh-CN')}
- 坚持天数：${Math.floor((Date.now() - new Date(plan.startDate)) / (1000 * 60 * 60 * 24)) + 1}天

最近打卡记录（最近30条）：
${checkInSummary || '暂无打卡记录'}

${question ? `用户问题：${question}` : '请分析打卡数据，给出：1. 进度评估 2. 改进建议 3. 鼓励话语'}

重要提示：
- 今天是${today}，如果计划刚开始（比如今天或昨天才开始），不要因为"没有7天打卡记录"而批评用户
- 计划开始天数少是正常的，重点关注打卡质量而非天数
- 请用温暖、专业的语气回复，控制在200字以内。`;

    // 调用 DeepSeek API
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      return 响应.json({
        success: true,
        data: {
          analysis: 'AI分析功能暂未配置。建议：保持规律打卡，循序渐进，不要给自己太大压力。坚持下去就是胜利！💪',
          isMock: true
        }
      });
    }
    
    try {
      const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个温暖专业的习惯养成教练，善于分析数据并给出实用建议。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      const aiData = await aiRes.json();
      const analysis = aiData.choices?.[0]?.message?.content || '分析生成失败';
      
      // 缓存分析结果
      plan.aiAnalysis = analysis;
      plan.aiAnalysisUpdatedAt = new Date();
      await plan.save();
      
      响应.json({
        success: true,
        data: { analysis, isMock: false }
      });
      
    } catch (aiError) {
      console.log('DeepSeek API 调用失败:', aiError.message);
      // 如果 AI 调用失败，返回模拟数据
      响应.json({
        success: true,
        data: {
          analysis: 'AI服务暂时不可用。建议：保持当前节奏，规律打卡比完美打卡更重要！你已经很棒了！🌟',
          isMock: true
        }
      });
    }
    
  } catch (错误) {
    console.log('AI 分析出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// AI 通用对话接口
app.post('/api/plans/ai-chat', authMiddleware, async (请求, 响应) => {
  try {
    const userId = 请求.userId;
    const { message, history } = 请求.body;
    
    if (!message) {
      return 响应.status(400).json({
        success: false,
        message: '消息不能为空'
      });
    }
    
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      return 响应.json({
        success: true,
        data: {
          reply: 'AI功能暂未配置，但你可以继续正常使用坚持计划功能。记住：坚持比完美更重要！💪'
        }
      });
    }
    
    // 构建消息历史
    const messages = [
      { role: 'system', content: '你是一个温暖专业的习惯养成教练，善于鼓励用户、提供实用建议。回复要简洁（100字以内），用中文。' },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];
    
    const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 200
      })
    });
    
    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || '抱歉，我暂时无法回答。';
    
    响应.json({
      success: true,
      data: { reply }
    });
    
  } catch (错误) {
    console.log('AI 对话出错：', 错误);
    响应.json({
      success: true,
      data: {
        reply: 'AI服务暂时不可用，但请继续加油！坚持就是胜利！🌟'
      }
    });
  }
});

// AI 生成计划建议
app.post('/api/plans/ai-suggest', authMiddleware, async (请求, 响应) => {
  try {
    const { goal, category } = 请求.body;
    
    if (!goal) {
      return 响应.status(400).json({
        success: false,
        message: '请描述你的目标'
      });
    }
    
    // 本地智能生成函数（API失败时使用）
    const generateLocalSuggestion = (goal) => {
      const goalLower = goal.toLowerCase();
      
      // 提取数字作为目标值
      const numberMatch = goal.match(/(\d+\.?\d*)/);
      const targetValue = numberMatch ? parseFloat(numberMatch[1]) : null;
      
      // 智能生成标题（去掉数字，简化描述）
      let title = goal.replace(/\d+\.?\d*/g, '').replace(/块|元|kg|分钟|页|次/g, '').trim();
      if (title.length > 10) title = title.slice(0, 10);
      if (!title) title = '新计划';
      
      let suggestion = {
        title: title,
        target: goal,
        unit: '次',
        hasValue: true,
        hasDuration: false,
        targetValue: targetValue,
        initialValue: 0,
        color: '#4CAF50',
        icon: '📝',
        subTasks: ['每天完成打卡', '记录完成情况', '定期检查进度']
      };
      
      // 根据关键词智能匹配单位和图标
      if (goalLower.includes('减肥') || goalLower.includes('体重') || goalLower.includes('kg') || goalLower.includes('斤')) {
        suggestion = { 
          ...suggestion, 
          unit: goalLower.includes('斤') ? '斤' : 'kg', 
          hasValue: true, 
          hasDuration: true,
          color: '#F44336', 
          icon: '⚖️',
          title: '减重计划',
          subTasks: ['每天运动30分钟', '控制饮食不吃夜宵', '每天早起称重', '每周记录体重变化']
        };
      } else if (goalLower.includes('存钱') || goalLower.includes('省钱') || goalLower.includes('元') || goalLower.includes('块') || goalLower.includes('钱')) {
        suggestion = { 
          ...suggestion, 
          unit: '元', 
          hasValue: true, 
          color: '#FF9800', 
          icon: '💰',
          title: '存钱计划',
          subTasks: ['每月固定存钱', '记账记录每日开销', '减少不必要消费', '定期查看存款余额']
        };
      } else if (goalLower.includes('跑步') || goalLower.includes('运动') || goalLower.includes('健身') || goalLower.includes('锻炼')) {
        suggestion = { 
          ...suggestion, 
          unit: '分钟', 
          hasDuration: true, 
          color: '#4CAF50', 
          icon: '🏃',
          title: goalLower.includes('跑步') ? '跑步打卡' : '运动健身',
          subTasks: ['跑前热身5分钟', '坚持跑步30分钟', '跑后拉伸10分钟', '记录运动数据']
        };
      } else if (goalLower.includes('学习') || goalLower.includes('读书') || goalLower.includes('英语') || goalLower.includes('阅读')) {
        suggestion = { 
          ...suggestion, 
          unit: goalLower.includes('页') ? '页' : '分钟', 
          hasDuration: true, 
          color: '#2196F3', 
          icon: '📚',
          title: '学习打卡',
          subTasks: ['设定学习时长', '专注不分心', '记录学习内容', '复习巩固知识']
        };
      } else if (goalLower.includes('喝水') || goalLower.includes('睡眠') || goalLower.includes('早起') || goalLower.includes('早睡')) {
        const isWater = goalLower.includes('喝水');
        suggestion = { 
          ...suggestion, 
          unit: isWater ? '杯' : '小时', 
          hasValue: true, 
          color: '#00BCD4', 
          icon: isWater ? '💧' : '😴',
          title: isWater ? '喝水打卡' : '作息管理',
          subTasks: isWater ? ['早起喝一杯水', '餐前半小时喝水', '每天至少8杯水', '睡前少喝水'] : ['固定睡觉时间', '睡前不看手机', '营造睡眠环境', '记录睡眠时长']
        };
      } else if (goalLower.includes('吃药') || goalLower.includes('药')) {
        suggestion = {
          ...suggestion,
          unit: '次',
          hasValue: false,
          color: '#E91E63',
          icon: '💊',
          title: '按时吃药',
          subTasks: ['设置服药提醒', '按医嘱剂量服用', '记录服药时间', '定期检查身体']
        };
      } else if (goalLower.includes('戒烟') || goalLower.includes('烟')) {
        suggestion = {
          ...suggestion,
          unit: '根',
          hasValue: true,
          targetValue: 0,
          color: '#795548',
          icon: '🚭',
          title: '戒烟计划',
          subTasks: ['记录每天吸烟数', '逐步减少吸烟量', '找替代品缓解', '奖励自己进步']
        };
      } else if (goalLower.includes('戒糖') || goalLower.includes('奶茶') || goalLower.includes('饮料')) {
        suggestion = {
          ...suggestion,
          unit: '杯',
          hasValue: true,
          color: '#E91E63',
          icon: '🧋',
          title: '戒糖计划',
          subTasks: ['记录每天糖摄入', '用水果代替甜品', '少喝含糖饮料', '选择低糖食品']
        };
      }
      
      return suggestion;
    };
    
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
      // 没有配置API KEY，使用本地智能匹配
      return 响应.json({
        success: true,
        data: generateLocalSuggestion(goal)
      });
    }
    
    const prompt = `用户想养成一个习惯，目标是："${goal}"，分类：${category || '自定义'}。
请为其生成一个合理的坚持计划，包含以下字段（JSON格式）：
{
  "title": "计划标题（简洁，10字以内）",
  "target": "具体目标描述（30字以内，概括用户想达成的目标）",
  "unit": "计量单位（如：分钟、页、次、kg、元、毫升）",
  "hasValue": true/false（是否需要记录数值，如体重、金额、页数等）,
  "hasDuration": true/false（是否需要记录时长，如运动、学习时长）,
  "targetValue": 数字或null（如果用户提到具体目标数值，如存10000元则填10000，减重5kg则填5，否则null）,
  "initialValue": 数字或0（起始值，如当前体重、当前存款，未提及则填0）,
  "color": "推荐颜色（十六进制，根据计划类型推荐：健康用绿色#4CAF50、存钱用橙色#FF9800、学习用蓝色#2196F3、运动用红色#F44336等）",
  "icon": "推荐emoji图标（如：💰存钱、⚖️减肥、🏃运动、📚学习、💧喝水、🧘冥想、🎸乐器、💊吃药）",
  "subTasks": ["子任务1", "子任务2", "子任务3"]（将目标拆解成3-5个可执行的具体小任务，如"减重5kg"可拆解为"每天运动30分钟、控制饮食、每天称重记录"等）,
  "repeatDays": [1,2,3,4,5]（每周执行的日期，0=周日，1=周一，以此类推。如工作日就是[1,2,3,4,5]，每天就是[0,1,2,3,4,5,6]）,
  "reminderTime": "20:00"（建议的提醒时间，24小时制，如早上8点就是"08:00"，晚上8点就是"20:00"）
}

示例：
- 用户说"存10000块" → {"title":"存钱计划","target":"攒够10000元","unit":"元","hasValue":true,"hasDuration":false,"targetValue":10000,"initialValue":0,"color":"#FF9800","icon":"💰","subTasks":["每月存1000元","减少不必要开支","记账记录每日开销"],"repeatDays":[1,2,3,4,5,6],"reminderTime":"20:00"}
- 用户说"减重到60kg" → {"title":"减重计划","target":"体重减到60kg","unit":"kg","hasValue":true,"hasDuration":true,"targetValue":60,"initialValue":70,"color":"#F44336","icon":"⚖️","subTasks":["每天跑步30分钟","控制饮食不吃夜宵","每天早起称重","每周游泳一次"],"repeatDays":[1,2,3,4,5],"reminderTime":"07:00"}
- 用户说"每天跑步30分钟" → {"title":"跑步打卡","target":"坚持每天跑步","unit":"分钟","hasValue":false,"hasDuration":true,"targetValue":null,"initialValue":0,"color":"#4CAF50","icon":"🏃","subTasks":["晨跑或夜跑30分钟","跑前热身5分钟","跑后拉伸10分钟","记录跑步路线"],"repeatDays":[0,1,2,3,4,5,6],"reminderTime":"06:30"}

重要：
1. 必须根据用户输入智能判断是否需要记录数值(hasValue)和时长(hasDuration)
2. 子任务要具体可执行，3-5个为宜
3. 只返回JSON，不要其他文字。`;

    const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个习惯养成专家，善于设计合理的坚持计划。只返回JSON格式数据。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    // 检查 HTTP 状态
    if (!aiRes.ok) {
      const errorData = await aiRes.json().catch(() => ({}));
      console.log('DeepSeek API 错误:', errorData);
      // API 调用失败，使用本地智能匹配
      throw new Error('API调用失败，使用默认逻辑');
    }
    
    const aiData = await aiRes.json();
    
    // 检查 API 返回的错误
    if (aiData.error) {
      console.log('DeepSeek API 返回错误:', aiData.error);
      throw new Error(aiData.error.message || 'API返回错误');
    }
    
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    // 提取 JSON
    let suggestion;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      suggestion = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
      // 确保必要字段存在
      if (!suggestion.title) suggestion.title = goal.slice(0, 20);
      if (!suggestion.target && suggestion.description) suggestion.target = suggestion.description;
      if (!suggestion.target) suggestion.target = goal;
      if (!suggestion.unit) suggestion.unit = '次';
      if (suggestion.hasValue === undefined) suggestion.hasValue = true;
      if (suggestion.hasDuration === undefined) suggestion.hasDuration = false;
      if (!suggestion.color) suggestion.color = '#4CAF50';
      if (!suggestion.icon) suggestion.icon = '📝';
    } catch (e) {
        suggestion = generateLocalSuggestion(goal);
    }
    
    响应.json({
      success: true,
      data: suggestion
    });
    
  } catch (错误) {
    console.log('AI 建议生成出错，使用本地智能匹配：', 错误.message);
    // API 出错时返回本地生成的建议
    响应.json({
      success: true,
      data: generateLocalSuggestion(goal)
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
