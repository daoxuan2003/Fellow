// ============================================
// 用户资料管理路由
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const {
  authMiddleware,
  avatarUpload,
  validateUploadedImage,
  AVATAR_IMAGE_TYPES,
  AVATAR_IMAGE_ERROR_MESSAGE
} = require('../middleware');
const { User } = require('../models');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

async function replaceAvatar(user, userId, file) {
  const previousAvatar = user.avatar;
  const filePath = await storageService.upload(
    file.buffer,
    'avatar',
    userId,
    null,
    file.safeFilename,
    { nickname: user.nickname }
  );

  try {
    user.avatar = filePath;
    await user.save();
  } catch (error) {
    user.avatar = previousAvatar;
    try {
      await storageService.delete(filePath);
    } catch (cleanupError) {
      logError('清理未写入的头像失败', cleanupError);
    }
    throw error;
  }

  if (previousAvatar && previousAvatar.startsWith('avatars/') && previousAvatar !== filePath) {
    try {
      await storageService.delete(previousAvatar);
    } catch (error) {
      logError('删除旧头像失败', error);
    }
  }

  return filePath;
}

/**
 * @route   GET /api/user/pair-code
 * @desc    获取当前未绑定用户的配对码
 * @access  Private
 */
router.get('/pair-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const inviteStatus = user.inviteStatus || 'idle';
    if (user.partnerId || inviteStatus !== 'idle') {
      return res.status(409).json({
        success: false,
        message: user.partnerId ? '已绑定伴侣，无需使用配对码' : '当前有未处理的邀请'
      });
    }

    res.json({
      success: true,
      data: {
        pairCode: user.pairCode
      }
    });
  } catch (error) {
    logError('获取配对码出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

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
          birthday: partner.birthday,
          avatar: partnerAvatarUrl,
          avatarUrl: partnerAvatarUrl,
          gender: partner.gender,
          homeMessage: partner.homeMessage || ''
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
        avatar: avatarUrl,
        gender: user.gender,
        birthday: user.birthday,
        anniversary: user.anniversary,
        bio: user.bio,
        partnerNote: user.partnerNote,
        homeMessage: user.homeMessage || '',
        partnerId: user.partnerId,
        partner: partnerInfo,
        boundAt: user.boundAt,
        connected: !!user.partnerId
      }
    });
  } catch (error) {
    logError('获取用户资料出错', error);
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

    const { name, gender, birthday, anniversary, bio, partnerNote, homeMessage } = req.body;

    // 更新字段
    if (name) user.nickname = name;
    if (gender) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    if (partnerNote !== undefined) user.partnerNote = partnerNote;
    const homeMessageChanged = homeMessage !== undefined;
    if (homeMessageChanged) user.homeMessage = String(homeMessage).trim().slice(0, 32);
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

    // 仅广播服务端确认并完成持久化的公开资料字段。
    const partnerUpdateData = {};
    if (name !== undefined) partnerUpdateData.nickname = user.nickname;
    if (gender !== undefined) partnerUpdateData.gender = user.gender;
    if (bio !== undefined) partnerUpdateData.bio = user.bio;
    if (birthday !== undefined) partnerUpdateData.birthday = user.birthday;
    if (anniversary !== undefined) partnerUpdateData.anniversary = user.anniversary;
    if (homeMessageChanged) partnerUpdateData.homeMessage = user.homeMessage || '';
    const publicProfileChanged = [name, gender, bio, birthday, anniversary]
      .some(value => value !== undefined);
    if (publicProfileChanged) {
      partnerUpdateData.avatar = avatarUrl;
      partnerUpdateData.avatarUrl = avatarUrl;
    }

    if (user.partnerId && Object.keys(partnerUpdateData).length > 0) {
      const notifyPartner = req.app.locals.notifyPartner;
      if (typeof notifyPartner === 'function') {
        notifyPartner(user.partnerId, {
          type: 'partnerUpdated',
          data: partnerUpdateData
        });
      }
    }

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
        homeMessage: user.homeMessage || '',
        avatar: avatarUrl
      }
    });
  } catch (error) {
    logError('更新用户资料出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
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

    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== 'string' ||
      !currentPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: '新密码长度需要在 8 到 128 个字符之间'
      });
    }

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
    logError('修改密码出错', error);
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
router.post(
  '/avatar',
  authMiddleware,
  avatarUpload.single('avatar'),
  validateUploadedImage(AVATAR_IMAGE_TYPES, AVATAR_IMAGE_ERROR_MESSAGE),
  async (req, res) => {
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

      const filePath = await replaceAvatar(user, req.userId, req.file);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const avatarUrl = await storageService.getUrl(filePath, 3600, baseUrl);

      res.json({
        success: true,
        message: '头像上传成功',
        avatarUrl
      });
    } catch (error) {
      logError('上传头像出错', error);
      res.status(500).json({
        success: false,
        message: '服务器出错了，请稍后再试'
      });
    }
  }
);

/**
 * @route   POST /api/upload/avatar
 * @desc    上传头像（旧版接口，保持兼容）
 * @access  Private
 */
router.post(
  '/upload/avatar',
  authMiddleware,
  avatarUpload.single('avatar'),
  validateUploadedImage(AVATAR_IMAGE_TYPES, AVATAR_IMAGE_ERROR_MESSAGE),
  async (req, res) => {
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

      const filePath = await replaceAvatar(user, req.userId, req.file);

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
      logError('上传头像出错', error);
      res.status(500).json({
        success: false,
        message: '上传失败，请重试'
      });
    }
  }
);

/**
 * @route   POST /api/user/update
 * @desc    更新用户信息（旧版接口，保持兼容）
 * @access  Private
 */
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    if (body.account !== undefined || body.password !== undefined) {
      return res.status(400).json({
        success: false,
        message: '账号和密码不能通过资料接口修改'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { nickname, gender, bio, boundAt, partnerNote } = body;

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
    logError('更新用户资料出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
