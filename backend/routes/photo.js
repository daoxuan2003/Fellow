// ============================================
// 相册路由
// ============================================

const express = require('express');
const { authMiddleware, upload } = require('../middleware');
const { User, Photo } = require('../models');
const storageService = require('../services/storage');

const router = express.Router();

// 辅助函数：获取称呼
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

/**
 * @route   POST /api/upload
 * @desc    通用文件上传
 * @access  Private
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
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
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF、WebP、HEIC 格式的图片'
      });
    }
    
    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: '图片大小不能超过 10MB'
      });
    }
    
    // 上传文件
    const filePath = await storageService.upload(
      req.file.buffer,
      'photo',
      req.userId,
      user.partnerId,
      req.file.originalname,
      { nickname: user.nickname }
    );
    
    // 获取访问 URL
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
    console.log('文件上传出错:', error);
    res.status(500).json({
      success: false,
      message: '上传失败，请重试'
    });
  }
});

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
    console.log('获取照片列表出错：', error);
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
    
    res.json({
      success: true,
      message: '上传成功',
      data: photo
    });
  } catch (error) {
    console.log('上传照片出错：', error);
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
    
    const photo = await Photo.findOneAndUpdate(
      { _id: req.params.id, coupleId },
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
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }
    
    res.json({
      success: true,
      message: '更新成功',
      data: photo
    });
  } catch (error) {
    console.log('更新照片出错：', error);
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
    
    const photo = await Photo.findOneAndDelete({ _id: req.params.id, coupleId });
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.log('删除照片出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
