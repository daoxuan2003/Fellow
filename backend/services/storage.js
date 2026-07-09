// ============================================
// 文件存储服务
// 支持本地开发（存本地）和生产环境（存雨云存储桶）
// ============================================

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { logError } = require('../utils/safeLogger');

// 存储模式：'local' 或 's3'
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function logStorage(...args) {
  if (!IS_PRODUCTION) console.log(...args);
}

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
let s3Available = false;

async function testS3Connection() {
  try {
    const { HeadBucketCommand } = require('@aws-sdk/client-s3');
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    logStorage('✅ S3 存储桶连接成功');
    s3Available = true;
    return true;
  } catch (error) {
    logError('❌ S3 连接失败:', error);
    console.error('   请检查: 1) STORAGE_MODE=s3  2) S3_ENDPOINT  3) S3_ACCESS_KEY  4) S3_SECRET_KEY  5) S3_BUCKET_NAME');
    s3Available = false;
    return false;
  }
}

if (STORAGE_MODE === 's3') {
  if (!S3_CONFIG.endpoint) {
    console.error('❌ STORAGE_MODE=s3 但未设置 S3_ENDPOINT');
  } else if (!process.env.S3_ACCESS_KEY) {
    console.error('❌ STORAGE_MODE=s3 但未设置 S3_ACCESS_KEY');
  } else if (!process.env.S3_SECRET_KEY) {
    console.error('❌ STORAGE_MODE=s3 但未设置 S3_SECRET_KEY');
  } else if (!S3_BUCKET) {
    console.error('❌ STORAGE_MODE=s3 但未设置 S3_BUCKET_NAME');
  } else {
    s3Client = new S3Client(S3_CONFIG);
    // 异步测试连接
    testS3Connection();
  }
} else {
  logStorage('✅ 本地存储模式，上传目录:', LOCAL_UPLOAD_DIR);
  logStorage('   如需使用 S3，请设置 STORAGE_MODE=s3');
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
function generateFilePath(type, userId, partnerId, filename, nickname) {
  const ext = path.extname(filename).toLowerCase();
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  
  switch (type) {
    case 'avatar': {
      // 使用昵称（或 userId）+ 时间戳命名，便于识别
      const safeNickname = nickname 
        ? nickname.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 20)
        : userId;
      return `avatars/${safeNickname}_${timestamp}${ext}`;
    }
      
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
    
    case 'cosmetics': {
      if (!partnerId) throw new Error('上传化妆品照片需要 partnerId');
      const coupleId = [userId, partnerId].sort().join('_');
      return `couples/${coupleId}/cosmetics/${timestamp}_${randomStr}${ext}`;
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
    '.avif': 'image/avif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
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
  getPublicStatus() {
    const mode = STORAGE_MODE === 's3' ? 's3' : 'local';
    const available = mode === 'local' || s3Available;

    return {
      mode,
      available,
      status: available ? 'ready' : 'unavailable'
    };
  },

  /**
   * 上传文件
   * @param {Object} options - 上传选项
   * @param {string} options.nickname - 用户昵称（用于生成文件名）
   */
  async upload(buffer, type, userId, partnerId, filename, options = {}) {
    const { nickname } = options;
    const filePath = generateFilePath(type, userId, partnerId, filename, nickname);
    
    logStorage(`[上传] 模式: ${STORAGE_MODE}, 文件名: ${filePath}, 大小: ${buffer.length} bytes`);
    
    if (STORAGE_MODE === 's3') {
      if (!s3Client) {
        throw new Error('S3 客户端未初始化，请检查环境变量配置');
      }
      if (!s3Available) {
        throw new Error('S3 连接不可用，请检查配置');
      }
      
      try {
        logStorage('[S3] 开始上传文件');
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: filePath,
          Body: buffer,
          ContentType: getContentType(filename),
        });
        const result = await s3Client.send(command);
        logStorage('✅ 上传至 S3 成功:', result.$metadata);
      } catch (error) {
        logError('❌ S3 上传失败:', error);
        if (!IS_PRODUCTION) {
          console.error('   Bucket:', S3_BUCKET);
          console.error('   Key:', filePath);
          console.error('   Endpoint:', S3_CONFIG.endpoint);
        }
        throw error;
      }
    } else {
      const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
      await ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, buffer);
      logStorage('✅ 保存至本地:', fullPath);
    }
    
    return filePath;
  },

  /**
   * 获取文件访问 URL
   * @param {string} baseUrl - 服务器基础 URL（本地模式需要）
   */
  async getUrl(filePath, expiresIn = 3600, baseUrl = '') {
    if (STORAGE_MODE === 's3' && s3Client) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: filePath,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } else {
      // 本地模式：返回完整 URL（如 http://localhost:3000/uploads/...）
      const serverUrl = baseUrl || process.env.BASE_URL || '';
      return `${serverUrl}/uploads/${filePath}`;
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
      logStorage('🗑️ 删除 S3 文件:', filePath);
    } else {
      const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
      try {
        await fs.unlink(fullPath);
        logStorage('🗑️ 删除本地文件:', filePath);
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
