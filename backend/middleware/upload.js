// ============================================
// 文件上传中间件配置
// ============================================

const multer = require('multer');

// 使用内存存储，文件会保存在内存中的 Buffer 里
// 适合直接将文件上传到云存储（如 S3）
const storage = multer.memoryStorage();

/**
 * 允许的图片 MIME 类型
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif'
];

const AVATAR_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const PHOTO_MAX_FILE_SIZE = 10 * 1024 * 1024;
const AVATAR_IMAGE_ERROR_MESSAGE = '只支持 JPG、PNG、GIF、WebP 格式的有效图片';
const PHOTO_IMAGE_ERROR_MESSAGE = '只支持 JPG、PNG、GIF、WebP、AVIF、HEIC/HEIF 格式的有效图片';

const SAFE_IMAGE_FILENAMES = {
  'image/jpeg': 'upload.jpg',
  'image/png': 'upload.png',
  'image/gif': 'upload.gif',
  'image/webp': 'upload.webp',
  'image/avif': 'upload.avif',
  'image/heic': 'upload.heic',
  'image/heif': 'upload.heif'
};

let fileTypeModulePromise;

/**
 * 验证文件是否为允许的图片类型
 * @param {string} mimetype - 文件的 MIME 类型
 * @returns {boolean}
 */
function isAllowedImageType(mimetype) {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
}

async function detectImageType(buffer) {
  if (!fileTypeModulePromise) {
    fileTypeModulePromise = import('file-type');
  }

  const { fileTypeFromBuffer } = await fileTypeModulePromise;
  try {
    return await fileTypeFromBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * Multer 的 fileFilter 只能检查客户端声明的 MIME；这里再检查文件签名，
 * 并生成不受原始文件名影响的安全文件名。
 */
function validateUploadedImage(
  allowedTypes = ALLOWED_IMAGE_TYPES,
  errorMessage = PHOTO_IMAGE_ERROR_MESSAGE
) {
  return async (req, res, next) => {
    if (!req.file) return next();

    try {
      const detectedType = await detectImageType(req.file.buffer);
      const isAllowed = detectedType && allowedTypes.includes(detectedType.mime);

      if (!isAllowed) {
        const error = new Error(errorMessage);
        error.code = 'INVALID_IMAGE_CONTENT';
        error.status = 400;
        return next(error);
      }

      req.file.detectedMime = detectedType.mime;
      req.file.safeFilename = SAFE_IMAGE_FILENAMES[detectedType.mime];
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * 头像上传配置（限制 5MB）
 */
const avatarUpload = multer({
  storage,
  limits: {
    fileSize: AVATAR_MAX_FILE_SIZE,
  }
});

/**
 * 照片上传配置（限制 10MB，支持更多格式）
 */
const photoUpload = multer({
  storage,
  limits: {
    fileSize: PHOTO_MAX_FILE_SIZE,
  }
});

module.exports = {
  avatarUpload,
  photoUpload,
  validateUploadedImage,
  isAllowedImageType,
  ALLOWED_IMAGE_TYPES,
  AVATAR_IMAGE_TYPES,
  AVATAR_IMAGE_ERROR_MESSAGE,
  PHOTO_IMAGE_ERROR_MESSAGE,
  AVATAR_MAX_FILE_SIZE,
  PHOTO_MAX_FILE_SIZE
};
