// ============================================
// 文件上传中间件配置
// ============================================

const multer = require('multer');

// 使用内存存储，文件会保存在内存中的 Buffer 里
// 适合直接将文件上传到云存储（如 S3）
const storage = multer.memoryStorage();

// 创建 multer 实例
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 默认最大 10MB
  }
});

/**
 * 允许的图片 MIME 类型
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/heic'
];

/**
 * 验证文件是否为允许的图片类型
 * @param {string} mimetype - 文件的 MIME 类型
 * @returns {boolean}
 */
function isAllowedImageType(mimetype) {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
}

/**
 * 创建文件过滤器
 * @param {string[]} allowedTypes - 允许的 MIME 类型数组
 * @returns {Function} multer 文件过滤器
 */
function createFileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  };
}

/**
 * 头像上传配置（限制 5MB）
 */
const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: createFileFilter(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
});

/**
 * 照片上传配置（限制 10MB，支持更多格式）
 */
const photoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
});

module.exports = {
  upload,
  avatarUpload,
  photoUpload,
  isAllowedImageType,
  ALLOWED_IMAGE_TYPES
};
