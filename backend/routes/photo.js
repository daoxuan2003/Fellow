// ============================================
// 相册路由
// ============================================

const express = require('express');
const {
  authMiddleware,
  photoUpload,
  validateUploadedImage,
  ALLOWED_IMAGE_TYPES,
  PHOTO_IMAGE_ERROR_MESSAGE
} = require('../middleware');
const { User, Photo } = require('../models');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

function emitPhotoSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'photoSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

// 辅助函数：获取称呼
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

/**
 * @route   POST /api/upload
 * @desc    上传情侣功能使用的图片
 * @access  Private
 */
router.post(
  '/upload',
  authMiddleware,
  photoUpload.single('file'),
  validateUploadedImage(ALLOWED_IMAGE_TYPES, PHOTO_IMAGE_ERROR_MESSAGE),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件'
        });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      if (!user.partnerId) {
        return res.status(400).json({
          success: false,
          message: '请先绑定伴侣'
        });
      }

      const filePath = await storageService.upload(
        req.file.buffer,
        'photo',
        req.userId,
        user.partnerId,
        req.file.safeFilename,
        { nickname: user.nickname }
      );

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = await storageService.getUrl(filePath, 3600, baseUrl);

      res.json({
        success: true,
        message: '上传成功',
        data: {
          path: filePath,
          url: fileUrl
        }
      });
    } catch (error) {
      logError('文件上传出错:', error);
      res.status(500).json({
        success: false,
        message: '上传失败，请重试'
      });
    }
  }
);

/**
 * @route   GET /api/photos
 * @desc    获取照片列表
 * @access  Private
 */
router.get('/photos', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.query;

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    // 构建查询条件
    const query = { coupleId };
    if (type && type !== 'all') {
      query.type = type;
    }

    const photos = await Photo.find(query).sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    logError('获取照片列表出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/photos
 * @desc    上传照片记录
 * @access  Private
 */
router.post('/photos', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { url, date, caption, tags, aspectRatio, type } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '照片URL不能为空'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    const photo = new Photo({
      coupleId,
      uploadedBy: userId,
      url,
      date: date || new Date(),
      caption: caption || '',
      tags: tags || [],
      aspectRatio: aspectRatio || 1,
      type: type || 'normal'
    });

    await photo.save();

    emitPhotoSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: photo._id,
        url: photo.url,
        date: photo.date,
        caption: photo.caption,
        tags: photo.tags,
        aspectRatio: photo.aspectRatio,
        type: photo.type,
        uploadedBy: photo.uploadedBy,
        createdAt: photo.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '上传成功',
      data: photo
    });
  } catch (error) {
    logError('上传照片出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/photos/:id
 * @desc    更新照片信息
 * @access  Private
 */
router.put('/photos/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { caption, tags, type, date } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    const photo = await Photo.findOne({ _id: req.params.id, coupleId });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    if (String(photo.uploadedBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己上传的照片'
      });
    }

    if (caption !== undefined) photo.caption = caption;
    if (tags !== undefined) photo.tags = tags;
    if (type !== undefined) photo.type = type;
    if (date !== undefined) photo.date = date;

    await photo.save();

    emitPhotoSync(req.app, coupleId, {
      action: 'update',
      payload: {
        id: photo._id,
        caption: photo.caption,
        tags: photo.tags,
        type: photo.type,
        date: photo.date
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '更新成功',
      data: photo
    });
  } catch (error) {
    logError('更新照片出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/photos/:id
 * @desc    删除照片
 * @access  Private
 */
router.delete('/photos/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    const photo = await Photo.findOne({ _id: req.params.id, coupleId });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    if (String(photo.uploadedBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己上传的照片'
      });
    }

    const deleteResult = await Photo.deleteOne({ _id: req.params.id, coupleId, uploadedBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    emitPhotoSync(req.app, coupleId, {
      action: 'delete',
      payload: {
        id: photo._id
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除照片出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
