// ============================================
// 邀请系统路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   POST /api/invite/send
 * @desc    发送绑定邀请
 * @access  Private
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { pairCode } = req.body;
    
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查发送者状态
    if (sender.inviteStatus !== 'idle') {
      return res.status(400).json({ 
        success: false, 
        message: sender.inviteStatus === 'bound' ? '您已经绑定了伴侣' : '您有未处理的邀请'
      });
    }
    
    // 查找接收者
    const receiver = await User.findOne({ pairCode: pairCode.toUpperCase() });
    if (!receiver) {
      return res.status(404).json({ success: false, message: '配对码不存在' });
    }
    
    // 不能邀请自己
    if (receiver._id.toString() === userId) {
      return res.status(400).json({ success: false, message: '不能邀请自己' });
    }
    
    // 检查接收者状态
    if (receiver.inviteStatus === 'bound') {
      return res.status(400).json({ success: false, message: '对方已经绑定了伴侣' });
    }
    if (receiver.inviteStatus !== 'idle') {
      return res.status(400).json({ success: false, message: '对方有未处理的邀请' });
    }
    
    // 更新发送者状态
    sender.inviteStatus = 'inviting';
    sender.invitingTo = receiver._id.toString();
    sender.inviteSentAt = new Date();
    sender.lastUpdate = new Date();
    await sender.save();
    
    // 更新接收者状态
    receiver.inviteStatus = 'invited';
    receiver.invitingTo = sender._id.toString();
    receiver.lastUpdate = new Date();
    await receiver.save();
    
    // 生成头像 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let senderAvatarUrl = null;
    if (sender.avatar) {
      senderAvatarUrl = await storageService.getUrl(sender.avatar, 3600, baseUrl);
    }
    
    let receiverAvatarUrl = null;
    if (receiver.avatar) {
      receiverAvatarUrl = await storageService.getUrl(receiver.avatar, 3600, baseUrl);
    }
    
    res.json({
      success: true,
      message: '邀请已发送',
      data: {
        to: {
          id: receiver._id,
          nickname: receiver.nickname,
          avatar: receiver.avatar,
          avatarUrl: receiverAvatarUrl,
          bio: receiver.bio,
          gender: receiver.gender
        }
      }
    });
  } catch (error) {
    console.log('发送邀请出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/invite/accept
 * @desc    接受邀请
 * @access  Private
 */
router.post('/accept', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (receiver.inviteStatus !== 'invited') {
      return res.status(400).json({ success: false, message: '没有待接受的邀请' });
    }
    
    const sender = await User.findById(receiver.invitingTo);
    if (!sender) {
      return res.status(404).json({ success: false, message: '邀请者不存在' });
    }
    
    if (sender.inviteStatus !== 'inviting' || sender.invitingTo !== userId) {
      return res.status(400).json({ success: false, message: '邀请已失效' });
    }
    
    const now = new Date();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // 处理纪念日
    let sharedAnniversary = receiver.anniversary || sender.anniversary || now;
    
    // 更新双方状态为已绑定
    receiver.inviteStatus = 'bound';
    receiver.partnerId = sender._id.toString();
    receiver.boundAt = now;
    receiver.anniversary = sharedAnniversary;
    receiver.invitingTo = null;
    receiver.lastUpdate = now;
    await receiver.save();
    
    sender.inviteStatus = 'bound';
    sender.partnerId = receiver._id.toString();
    sender.boundAt = now;
    sender.anniversary = sharedAnniversary;
    sender.invitingTo = null;
    sender.lastUpdate = now;
    await sender.save();
    
    // 生成头像 URL
    const receiverAvatarUrl = receiver.avatar ? await storageService.getUrl(receiver.avatar, 3600, baseUrl) : null;
    const senderAvatarUrl = sender.avatar ? await storageService.getUrl(sender.avatar, 3600, baseUrl) : null;
    
    res.json({
      success: true,
      message: '绑定成功！恭喜你们成为情侣',
      data: {
        partner: {
          id: sender._id,
          nickname: sender.nickname,
          avatar: senderAvatarUrl,
          gender: sender.gender,
          bio: sender.bio
        },
        boundAt: now,
        anniversary: sharedAnniversary
      }
    });
  } catch (error) {
    console.log('接受邀请出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/invite/reject
 * @desc    拒绝邀请
 * @access  Private
 */
router.post('/reject', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (receiver.inviteStatus !== 'invited') {
      return res.status(400).json({ success: false, message: '没有待处理的邀请' });
    }
    
    const senderId = receiver.invitingTo;
    const sender = await User.findById(senderId);
    
    // 重置双方状态
    receiver.inviteStatus = 'idle';
    receiver.invitingTo = null;
    receiver.inviteSentAt = null;
    receiver.lastUpdate = new Date();
    await receiver.save();
    
    if (sender && sender.inviteStatus === 'inviting') {
      sender.inviteStatus = 'idle';
      sender.invitingTo = null;
      sender.inviteSentAt = null;
      sender.lastUpdate = new Date();
      await sender.save();
    }
    
    res.json({ success: true, message: '已拒绝邀请' });
  } catch (error) {
    console.log('拒绝邀请出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/invite/cancel
 * @desc    取消发出的邀请
 * @access  Private
 */
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (sender.inviteStatus !== 'inviting') {
      return res.status(400).json({ success: false, message: '没有待取消的邀请' });
    }
    
    const receiverId = sender.invitingTo;
    const receiver = await User.findById(receiverId);
    
    // 重置双方状态
    sender.inviteStatus = 'idle';
    sender.invitingTo = null;
    sender.inviteSentAt = null;
    sender.lastUpdate = new Date();
    await sender.save();
    
    if (receiver && receiver.inviteStatus === 'invited') {
      receiver.inviteStatus = 'idle';
      receiver.invitingTo = null;
      receiver.inviteSentAt = null;
      receiver.lastUpdate = new Date();
      await receiver.save();
    }
    
    res.json({ success: true, message: '已取消邀请' });
  } catch (error) {
    console.log('取消邀请出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
