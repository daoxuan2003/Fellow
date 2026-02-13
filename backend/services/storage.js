// ============================================
// 文件存储服务
// 支持本地开发（存本地）和生产环境（存雨云存储桶）
// ============================================

const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// 存储模式：'local' 或 's3'
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

// 本地存储配置
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../uploads');

// 雨云 S3 兼容配置
const S3_CONFIG = {
  region: process.env.S3_REGION || 'cn-north-1',
  endpoint: process.env.S3_ENDPOINT,  // 雨云提供的 endpoint
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
};

// S3 存储桶名称
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// 创建 S3 客户端（生产环境）
let s3Client = null;
if (STORAGE_MODE === 's3' && S3_CONFIG.endpoint) {
  s3Client = new S3Client(S3_CONFIG);
  console.log('✅ S3 存储已配置:', S3_BUCKET);
} else {
  console.log('✅ 本地存储模式，上传目录:', LOCAL_UPLOAD_DIR);
}

// ============================================
// 工具函数
// ============================================

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 生成文件路径/Key
 * 
 * 路径结构设计：
 * - 头像：avatars/{userId}_{timestamp}.ext
 * - 情侣照片：couples/{coupleId}/photos/{timestamp}_{random}.ext
 * - 日记附件：couples/{coupleId}/diaries/{diaryId}/{timestamp}_{random}.ext
 * 
 * coupleId 生成：两个 userId 按字母排序后用下划线连接
 * 例：userA 和 userB → "userA_userB"
 */
function generateFilePath(type, userId, partnerId, filename) {
  const ext = path.extname(filename).toLowerCase();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  switch (type) {
    case 'avatar':
      return `avatars/${userId}_${timestamp}${ext}`;
      
    case 'photo': {
      if (!partnerId) throw new Error('上传照片需要 partnerId');
      const coupleId = [userId, partnerId].sort().join('_');
      return `couples/${coupleId}/photos/${timestamp}_${randomStr}${ext}`;
    }
      
    case 'diary': {
      if (!partnerId) throw new Error('上传日记附件需要 partnerId');
      const coupleId = [userId, partnerId].sort().join('_');
      const diaryId = arguments[3];
      return `couples/${coupleId}/diaries/${diaryId}/${timestamp}_${randomStr}${ext}`;
    }
      
    default:
      throw new Error('未知的文件类型: ' + type);
  }
}

/**
 * 从路径解析 coupleId
 */
function parseCoupleIdFromPath(filePath) {
  const match = filePath.match(/couples\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * 检查用户是否有权限访问文件
 */
function hasAccess(userId, partnerId, filePath) {
  // 头像：只能访问自己的
  if (filePath.startsWith('avatars/')) {
    const fileUserId = path.basename(filePath).split('_')[0];
    return fileUserId === userId;
  }
  
  // 情侣文件：检查 coupleId
  const coupleId = parseCoupleIdFromPath(filePath);
  if (coupleId) {
    const expectedCoupleId = partnerId 
      ? [userId, partnerId].sort().join('_')
      : userId;
    return coupleId === expectedCoupleId;
  }
  
  return false;
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================
// 存储服务
// ============================================

const storageService = {
  /**
   * 上传文件
   */
  async upload(buffer, type, userId, partnerId, filename) {
    const filePath = generateFilePath(type, userId, partnerId, filename);
    
    if (STORAGE_MODE === 's3' && s3Client) {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: getContentType(filename),
      });
      await s3Client.send(command);
      console.log('✅ 上传至 S3:', filePath);
    } else {
      const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
      await ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, buffer);
      console.log('✅ 保存至本地:', filePath);
    }
    
    return filePath;
  },

  /**
   * 获取文件访问 URL
   */
  async getUrl(filePath, expiresIn = 3600) {
    if (STORAGE_MODE === 's3' && s3Client) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: filePath,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } else {
      return `/uploads/${filePath}`;
    }
  },

  /**
   * 删除文件
   */
  async delete(filePath) {
    if (STORAGE_MODE === 's3' && s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: filePath,
      });
      await s3Client.send(command);
      console.log('🗑️ 删除 S3 文件:', filePath);
    } else {
      const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
      try {
        await fs.unlink(fullPath);
        console.log('🗑️ 删除本地文件:', filePath);
      } catch (e) {
        // 忽略
      }
    }
  },

  /**
   * 批量获取 URL
   */
  async getUrls(filePaths) {
    return Promise.all(
      filePaths.map(async (filePath) => ({
        path: filePath,
        url: await this.getUrl(filePath),
      }))
    );
  },

  generateFilePath,
  parseCoupleIdFromPath,
  hasAccess,
  STORAGE_MODE,
};

module.exports = storageService;
