// ============================================
// 用户模型
// 创建用户的数据模板，就像设计一张表格，规定要填写哪些信息
// Schema 就是"模式"的意思，告诉数据库每张表应该长什么样
// ============================================

const mongoose = require('mongoose');

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
  
  // 头像（存储路径）
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
module.exports = mongoose.model('User', userSchema);
