// ============================================
// 认证相关路由
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const storageService = require('../services/storage');

const router = express.Router();

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-local-development-only';
const JWT_EXPIRES = '7d';

/**
 * @route   POST /api/register
 * @desc    注册新用户
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { nickname, account, password } = req.body;
    
    // 检查账号是否已存在
    const existingUser = await User.findOne({ account });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '这个账号已经被注册了'
      });
    }
    
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 生成配对码
    const pairCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 创建新用户
    const newUser = new User({
      nickname,
      account,
      password: hashedPassword,
      pairCode
    });
    
    await newUser.save();
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: newUser._id, account: newUser.account },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        expiresIn: JWT_EXPIRES
      }
    });
  } catch (error) {
    console.log('注册出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

/**
 * @route   POST /api/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ account });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '账号或密码错误'
      });
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '账号或密码错误'
      });
    }
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user._id, account: user.account },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        expiresIn: JWT_EXPIRES
      }
    });
  } catch (error) {
    console.log('登录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

/**
 * @route   GET /api/me
 * @desc    获取当前登录用户信息
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // 查找伴侣信息
    let partnerInfo = null;
    if (user.partnerId) {
      const partner = await User.findById(user.partnerId);
      if (partner) {
        let partnerAvatarUrl = null;
        if (partner.avatar) {
          partnerAvatarUrl = await storageService.getUrl(partner.avatar, 3600, baseUrl);
        }
        
        partnerInfo = {
          id: partner._id.toString(),
          nickname: partner.nickname,
          pairCode: partner.pairCode,
          avatar: partner.avatar,
          avatarUrl: partnerAvatarUrl,
          bio: partner.bio,
          gender: partner.gender,
          birthday: partner.birthday
        };
      }
    }
    
    // 生成头像 URL
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await storageService.getUrl(user.avatar, 3600, baseUrl);
    }
    
    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        nickname: user.nickname,
        account: user.account,
        pairCode: user.pairCode,
        avatar: user.avatar,
        avatarUrl,
        bio: user.bio,
        gender: user.gender,
        birthday: user.birthday,
        anniversary: user.anniversary,
        partnerNote: user.partnerNote,
        partnerId: user.partnerId,
        partner: partnerInfo,
        boundAt: user.boundAt,
        inviteStatus: user.inviteStatus || 'idle',
        invitingTo: user.invitingTo,
        inviteSentAt: user.inviteSentAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.log('获取用户信息出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/user/:userId
 * @desc    获取指定用户信息（公开接口）
 * @access  Public
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查找伴侣信息
    let partnerInfo = null;
    if (user.partnerId) {
      const partner = await User.findById(user.partnerId);
      if (partner) {
        partnerInfo = {
          id: partner._id,
          nickname: partner.nickname,
          pairCode: partner.pairCode
        };
      }
    }
    
    // 生成头像 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await storageService.getUrl(user.avatar, 3600, baseUrl);
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        nickname: user.nickname,
        account: user.account,
        pairCode: user.pairCode,
        avatar: user.avatar,
        avatarUrl,
        bio: user.bio,
        gender: user.gender,
        partnerId: user.partnerId,
        partner: partnerInfo,
        boundAt: user.boundAt,
        createdAt: user.createdAt,
        inviteStatus: user.inviteStatus || 'idle',
        invitingTo: user.invitingTo,
        inviteSentAt: user.inviteSentAt
      }
    });
  } catch (error) {
    console.log('获取用户信息出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
