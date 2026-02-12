// ============================================
// 这是服务器的主文件，就像餐厅的前台经理
// 负责接收顾客的请求，然后安排厨房（数据库）处理
// ============================================

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

// 创建 express 应用实例，这就是我们服务器的本体
const app = express();

// ============================================
// 第一部分：连接数据库
// ============================================

// 连接 MongoDB 数据库
// 这里的字符串是数据库的地址，couple_db 是数据库的名字
// 如果数据库不存在，MongoDB 会自动创建
mongoose.connect('mongodb://localhost:27017/couple_db')
  .then(() => {
    // 连接成功的提示
    console.log('数据库连接成功！');
  })
  .catch((错误信息) => {
    // 连接失败的提示，打印错误原因
    console.log('数据库连接失败：', 错误信息);
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
  
  // 创建时间，记录什么时候注册的
  createdAt: {
    type: Date,
    default: Date.now  // Date.now 是当前时间
  }
});

// 根据上面的模板，创建真正的"用户表"（在 MongoDB 里叫 Collection）
// 'User' 会变成数据库里的 'users'（自动变复数）
const User = mongoose.model('User', userSchema);

// ============================================
// 第三部分：中间件配置
// ============================================

// 使用 cors 中间件，允许前端访问后端
// 就像在门口挂个牌子：欢迎光临
app.use(cors());

// 使用 express.json() 中间件，自动把收到的 JSON 数据转换成 JavaScript 对象
// 就像自动翻译机，把客人的话翻译成我们能听懂的语言
app.use(express.json());

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
    
    // 第六步：返回成功信息给前端
    // json() 表示返回 JSON 格式的数据
    响应.status(201).json({  // 201 表示"创建成功"
      success: true,
      message: '注册成功',
      data: {
        id: 新用户._id,           // 用户的唯一ID
        nickname: 新用户.nickname,
        account: 新用户.account,
        pairCode: 新用户.pairCode  // 把配对码发给前端
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
    
    // 第三步：查找伴侣信息（如果已经绑定了）
    let 伴侣信息 = null;
    if (用户.partnerId) {
      // 根据 partnerId 查找伴侣
      const 伴侣 = await User.findById(用户.partnerId);
      if (伴侣) {
        伴侣信息 = {
          id: 伴侣._id,
          nickname: 伴侣.nickname,
          pairCode: 伴侣.pairCode
        };
      }
    }
    
    // 第四步：返回用户信息和伴侣信息
    响应.json({
      success: true,
      message: '登录成功',
      data: {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        pairCode: 用户.pairCode,
        partnerId: 用户.partnerId,
        partner: 伴侣信息,      // 伴侣的详细信息
        boundAt: 用户.boundAt,  // 绑定时间
        createdAt: 用户.createdAt
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

// 接口 3：绑定情侣
// 输入对方的配对码，完成绑定
app.post('/api/bind', async (请求, 响应) => {
  try {
    // 拿到自己的ID和对方的配对码
    const { userId, pairCode } = 请求.body;
    
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
    
    // 返回用户信息
    响应.json({
      success: true,
      data: {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        pairCode: 用户.pairCode,
        partnerId: 用户.partnerId,
        partner: 伴侣信息,
        boundAt: 用户.boundAt,
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

// 接口 5：解除绑定（如果需要分手功能的话，暂时留着备用）
app.post('/api/unbind', async (请求, 响应) => {
  try {
    const { userId } = 请求.body;
    
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
    await 自己.save();
    
    if (对方) {
      对方.partnerId = null;
      对方.boundAt = null;
      await 对方.save();
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

// 接口 6：更新用户资料
app.post('/api/user/update', async (请求, 响应) => {
  try {
    const { 
      userId, 
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
    if (avatar !== undefined) 用户.avatar = avatar;
    if (partnerNote !== undefined) 用户.partnerNote = partnerNote;
    
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
    
    // 保存更改
    await 用户.save();
    
    // 返回更新后的用户信息
    响应.json({
      success: true,
      message: '更新成功',
      data: {
        id: 用户._id,
        nickname: 用户.nickname,
        account: 用户.account,
        gender: 用户.gender,
        bio: 用户.bio,
        avatar: 用户.avatar,
        pairCode: 用户.pairCode,
        partnerId: 用户.partnerId,
        partnerNote: 用户.partnerNote,
        boundAt: 用户.boundAt
      }
    });
    
  } catch (错误) {
    console.log('更新用户资料出错：', 错误);
    响应.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// ============================================
// 第五部分：启动服务器
// ============================================

// 设置服务器监听的端口号
// 3000 是开发常用的端口，就像门牌号
const 端口 = 3000;

// 启动服务器
app.listen(端口, () => {
  // 服务器启动成功的提示
  console.log('服务器启动成功！');
  console.log('访问地址：http://localhost:' + 端口);
});
