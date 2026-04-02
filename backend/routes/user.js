// ============================================
// 用户资料管理路由
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, upload } = require('../middleware');
const { User } = require('../models');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    获取当前用户资料
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
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
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let partnerAvatarUrl = null;
        if (partner.avatar) {
          partnerAvatarUrl = await storageService.getUrl(partner.avatar, 3600, baseUrl);
        }
        
        partnerInfo = {
          id: partner._id,
          nickname: partner.nickname,
          pairCode: partner.pairCode,
          birthday: partner.birthday,
          avatar: partnerAvatarUrl,
          avatarUrl: partnerAvatarUrl,
          gender: partner.gender
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
      user: {
        id: user._id,
        name: user.nickname,
        nickname: user.nickname,
        account: user.account,
        inviteCode: user.pairCode,
        pairCode: user.pairCode,
        avatar: avatarUrl,
        gender: user.gender,
        birthday: user.birthday,
        anniversary: user.anniversary,
        bio: user.bio,
        partnerNote: user.partnerNote,
        partnerId: user.partnerId,
        partner: partnerInfo,
        boundAt: user.boundAt,
        connected: !!user.partnerId
      }
    });
  } catch (error) {
    console.log('获取用户资料出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    更新用户资料
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const { name, gender, birthday, anniversary, bio, partnerNote } = req.body;
    
    // 更新字段
    if (name) user.nickname = name;
    if (gender) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    if (partnerNote !== undefined) user.partnerNote = partnerNote;
    if (birthday) user.birthday = new Date(birthday);
    
    // 纪念日是双方共享的
    let syncAnniversary = false;
    if (anniversary !== undefined && anniversary !== '') {
      user.anniversary = new Date(anniversary);
      syncAnniversary = true;
    }
    
    await user.save();
    
    // 同步更新伴侣的纪念日
    if (syncAnniversary && user.partnerId) {
      const partner = await User.findById(user.partnerId);
      if (partner) {
        partner.anniversary = user.anniversary;
        await partner.save();
      }
    }
    
    // 生成头像 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = user.avatar ? await storageService.getUrl(user.avatar, 3600, baseUrl) : null;
    
    res.json({
      success: true,
      message: '保存成功',
      user: {
        id: user._id,
        name: user.nickname,
        nickname: user.nickname,
        gender: user.gender,
        bio: user.bio,
        birthday: user.birthday,
        anniversary: user.anniversary,
        partnerNote: user.partnerNote,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.log('更新用户资料出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了: ' + error.message
    });
  }
});

/**
 * @route   PUT /api/user/password
 * @desc    修改密码
 * @access  Private
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // 验证当前密码
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.log('修改密码出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/user/avatar
 * @desc    上传头像
 * @access  Private
 */
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择图片'
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
      });
    }
    
    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: '图片大小不能超过 5MB'
      });
    }
    
    // 删除旧头像
    if (user.avatar && user.avatar.startsWith('avatars/')) {
      try {
        await storageService.delete(user.avatar);
      } catch (e) {
        console.log('删除旧头像失败:', e.message);
      }
    }
    
    // 上传新头像
    const filePath = await storageService.upload(
      req.file.buffer,
      'avatar',
      req.userId,
      null,
      req.file.originalname,
      { nickname: user.nickname }
    );
    
    // 更新用户头像
    user.avatar = filePath;
    await user.save();
    
    // 生成 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = await storageService.getUrl(filePath, 3600, baseUrl);
    
    res.json({
      success: true,
      message: '头像上传成功',
      avatarUrl
    });
  } catch (error) {
    console.log('上传头像出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了: ' + error.message
    });
  }
});

/**
 * @route   POST /api/upload/avatar
 * @desc    上传头像（旧版接口，保持兼容）
 * @access  Private
 */
router.post('/upload/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
      });
    }
    
    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: '图片大小不能超过 5MB'
      });
    }
    
    // 删除旧头像
    if (user.avatar && user.avatar.startsWith('avatars/')) {
      try {
        await storageService.delete(user.avatar);
      } catch (e) {
        console.log('删除旧头像失败:', e.message);
      }
    }
    
    // 上传新头像
    const filePath = await storageService.upload(
      req.file.buffer,
      'avatar',
      req.userId,
      null,
      req.file.originalname,
      { nickname: user.nickname }
    );
    
    // 更新用户头像
    user.avatar = filePath;
    await user.save();
    
    // 生成 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = await storageService.getUrl(filePath, 3600, baseUrl);
    
    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: filePath,
        avatarUrl
      }
    });
  } catch (error) {
    console.log('上传头像出错:', error);
    res.status(500).json({
      success: false,
      message: '上传失败，请重试'
    });
  }
});

/**
 * @route   POST /api/user/update
 * @desc    更新用户信息（旧版接口，保持兼容）
 * @access  Private
 */
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { nickname, account, password, gender, bio, avatar, boundAt, partnerNote } = req.body;
    
    // 修改账号时检查是否已被占用
    if (account && account !== user.account) {
      const existingUser = await User.findOne({ account });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该账号已被使用'
        });
      }
      user.account = account;
    }
    
    // 更新其他字段
    if (nickname) user.nickname = nickname;
    if (gender) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    if (partnerNote !== undefined) user.partnerNote = partnerNote;
    if (req.body.birthday) user.birthday = new Date(req.body.birthday);
    
    // 更新纪念日
    if (boundAt) {
      user.boundAt = new Date(boundAt);
      if (user.partnerId) {
        const partner = await User.findById(user.partnerId);
        if (partner) {
          partner.boundAt = user.boundAt;
          await partner.save();
        }
      }
    }
    
    // 更新密码
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    user.lastUpdate = new Date();
    await user.save();
    
    // 准备返回数据
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await storageService.getUrl(user.avatar, 3600, baseUrl);
    }
    
    const responseData = {
      id: user._id,
      nickname: user.nickname,
      account: user.account,
      gender: user.gender,
      bio: user.bio,
      birthday: user.birthday,
      avatar: user.avatar,
      avatarUrl,
      pairCode: user.pairCode,
      partnerId: user.partnerId,
      partnerNote: user.partnerNote,
      boundAt: user.boundAt,
      lastUpdate: user.lastUpdate,
      inviteStatus: user.inviteStatus || 'idle',
      invitingTo: user.invitingTo,
      inviteSentAt: user.inviteSentAt
    };
    
    res.json({
      success: true,
      message: '更新成功',
      data: responseData
    });
  } catch (error) {
    console.log('更新用户资料出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
