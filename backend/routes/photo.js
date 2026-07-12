// ============================================
// 相册路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
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
const VALID_PHOTO_TYPES = new Set(['normal', 'travel', 'food']);
const MAX_PHOTO_TAGS = 20;

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function emitPhotoSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'photoSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function normalizePhotoTags(tags) {
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return { error: '照片标签格式不正确' };
    }
    return {
      tags: tags
        .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean)
        .slice(0, MAX_PHOTO_TAGS)
    };
  }

  return { tags: [] };
}

function normalizePhotoType(type) {
  if (type !== undefined) {
    if (!VALID_PHOTO_TYPES.has(type)) {
      return { error: '照片类型不正确' };
    }
    return { type };
  }

  return { type: 'normal' };
}

function normalizePhotoDate(date, fallback = null) {
  if (date !== undefined) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: '照片日期不正确' };
    }
    return { date: parsedDate };
  }

  return { date: fallback };
}

function normalizeAspectRatio(aspectRatio) {
  if (aspectRatio === undefined || aspectRatio === null || aspectRatio === '') {
    return { aspectRatio: 1 };
  }

  const value = Number(aspectRatio);
  if (!Number.isFinite(value) || value <= 0 || value > 10) {
    return { error: '照片比例不正确' };
  }

  return { aspectRatio: value };
}

function buildPhotoUpdate(body) {
  const { caption, tags, type, date } = body;
  const update = {};

  if (caption !== undefined) {
    update.caption = caption == null ? '' : String(caption).trim();
  }

  if (tags !== undefined) {
    const tagResult = normalizePhotoTags(tags);
    if (tagResult.error) return { error: tagResult.error };
    update.tags = tagResult.tags;
  }

  if (type !== undefined) {
    const typeResult = normalizePhotoType(type);
    if (typeResult.error) return { error: typeResult.error };
    update.type = typeResult.type;
  }

  if (date !== undefined) {
    const dateResult = normalizePhotoDate(date);
    if (dateResult.error) return { error: dateResult.error };
    update.date = dateResult.date;
  }

  return { update };
}

function normalizeStoragePath(storagePath) {
  if (typeof storagePath !== 'string') return null;
  const value = storagePath.trim();
  if (
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').includes('..') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  ) {
    return null;
  }
  return value;
}

function isAccessibleAlbumPhotoPath(userId, partnerId, coupleId, storagePath) {
  return (
    storagePath.startsWith(`couples/${coupleId}/photos/`) &&
    storageService.hasAccess(userId, partnerId, storagePath)
  );
}

async function serializePhoto(photo, req, overrides = {}) {
  const data = typeof photo.toObject === 'function' ? photo.toObject() : { ...photo };

  if (data.storagePath) {
    data.url = overrides.url || await storageService.getUrl(data.storagePath, 3600, getBaseUrl(req));
  }

  delete data.storagePath;
  return data;
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

      const baseUrl = getBaseUrl(req);
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
    const serializedPhotos = await Promise.all(photos.map(photo => serializePhoto(photo, req)));

    res.json({
      success: true,
      data: serializedPhotos
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
    const { path: storagePathInput, date, caption, tags, aspectRatio, type } = req.body;

    const storagePath = normalizeStoragePath(storagePathInput);
    if (!storagePath) {
      return res.status(400).json({
        success: false,
        message: '照片文件路径不能为空'
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
    if (!isAccessibleAlbumPhotoPath(userId, user.partnerId, coupleId, storagePath)) {
      return res.status(403).json({
        success: false,
        message: '无权使用该照片文件'
      });
    }

    const tagResult = normalizePhotoTags(tags);
    if (tagResult.error) {
      return res.status(400).json({
        success: false,
        message: tagResult.error
      });
    }

    const typeResult = normalizePhotoType(type);
    if (typeResult.error) {
      return res.status(400).json({
        success: false,
        message: typeResult.error
      });
    }

    const dateResult = normalizePhotoDate(date, new Date());
    if (dateResult.error) {
      return res.status(400).json({
        success: false,
        message: dateResult.error
      });
    }

    const aspectRatioResult = normalizeAspectRatio(aspectRatio);
    if (aspectRatioResult.error) {
      return res.status(400).json({
        success: false,
        message: aspectRatioResult.error
      });
    }

    const photoUrl = await storageService.getUrl(storagePath, 3600, getBaseUrl(req));

    const photo = new Photo({
      coupleId,
      uploadedBy: userId,
      storagePath,
      url: photoUrl,
      date: dateResult.date,
      caption: caption == null ? '' : String(caption).trim(),
      tags: tagResult.tags,
      aspectRatio: aspectRatioResult.aspectRatio,
      type: typeResult.type
    });

    await photo.save();
    const serializedPhoto = await serializePhoto(photo, req, { url: photoUrl });

    emitPhotoSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: serializedPhoto._id,
        url: serializedPhoto.url,
        date: serializedPhoto.date,
        caption: serializedPhoto.caption,
        tags: serializedPhoto.tags,
        aspectRatio: serializedPhoto.aspectRatio,
        type: serializedPhoto.type,
        uploadedBy: serializedPhoto.uploadedBy,
        createdAt: serializedPhoto.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '上传成功',
      data: serializedPhoto
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

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

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

    const { update, error } = buildPhotoUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    if (Object.keys(update).length === 0) {
      const serializedPhoto = await serializePhoto(photo, req);
      return res.json({
        success: true,
        message: '更新成功',
        data: serializedPhoto
      });
    }

    const updatedPhoto = await Photo.findOneAndUpdate(
      { _id: req.params.id, coupleId, uploadedBy: userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updatedPhoto) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    const serializedPhoto = await serializePhoto(updatedPhoto, req);

    emitPhotoSync(req.app, coupleId, {
      action: 'update',
      payload: {
        id: serializedPhoto._id,
        caption: serializedPhoto.caption,
        tags: serializedPhoto.tags,
        type: serializedPhoto.type,
        date: serializedPhoto.date
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '更新成功',
      data: serializedPhoto
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

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
