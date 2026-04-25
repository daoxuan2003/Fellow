// ============================================
// 数据库自动备份脚本
// 用法: node scripts/backup-db.js
//
// 功能:
// 1. 使用 mongodump 导出数据库为 gzip 归档
// 2. 上传到 S3（如果配置了）
// 3. 自动清理 30 天前的旧备份（本地 + S3）
// ============================================

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// 加载环境变量
require('dotenv').config();

// 配置
const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;

// S3 配置（复用项目现有配置）
const s3Client = (() => {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint || !S3_BUCKET) return null;
  return new S3Client({
    region: process.env.S3_REGION || 'cn-north-1',
    endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
})();

// 工具函数
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 50, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        error.stdout = stdout;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function maskUri(uri) {
  if (!uri) return '未配置';
  try {
    const url = new URL(uri);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch {
    return uri.replace(///.*@/, '//***@');
  }
}

// S3 操作
async function uploadToS3(filePath, key) {
  if (!s3Client || !S3_BUCKET) {
    console.log('⚠️  S3 未配置，跳过远程备份');
    return false;
  }
  const buffer = await fs.readFile(filePath);
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/gzip',
  }));
  console.log(`☁️  已上传至 S3: ${key}`);
  return true;
}

async function cleanS3Backups() {
  if (!s3Client || !S3_BUCKET) return;
  const prefix = 'backups/db/';
  const { Contents, IsTruncated } = await s3Client.send(new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  }));

  if (!Contents || Contents.length === 0) {
    console.log('🧹 S3 无历史备份需要清理');
    return;
  }

  // 如果对象很多被截断了，继续获取（通常备份文件不多，这里简单处理）
  if (IsTruncated) {
    console.log('⚠️  S3 备份列表被截断，可能未完全清理');
  }

  const now = Date.now();
  let deleted = 0;
  for (const obj of Contents) {
    const ageDays = (now - obj.LastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > BACKUP_RETENTION_DAYS) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: obj.Key,
      }));
      deleted++;
      console.log(`🗑️  删除 S3 旧备份: ${path.basename(obj.Key)} (${ageDays.toFixed(0)} 天前)`);
    }
  }
  console.log(`🧹 S3 备份清理完成，删除 ${deleted} 个文件`);
}

// 本地清理
async function cleanLocalBackups() {
  let files;
  try {
    files = await fs.readdir(BACKUP_DIR);
  } catch {
    console.log('🧹 本地备份目录不存在，无需清理');
    return;
  }

  const now = Date.now();
  let deleted = 0;
  for (const file of files) {
    if (!file.startsWith('backup_') || !file.endsWith('.gz')) continue;
    const filePath = path.join(BACKUP_DIR, file);
    const stat = await fs.stat(filePath);
    const ageDays = (now - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > BACKUP_RETENTION_DAYS) {
      await fs.unlink(filePath);
      deleted++;
      console.log(`🗑️  删除本地旧备份: ${file} (${ageDays.toFixed(0)} 天前)`);
    }
  }
  console.log(`🧹 本地备份清理完成，删除 ${deleted} 个文件`);
}

// 检查 mongodump 是否可用
async function checkMongodump() {
  try {
    await execPromise('mongodump --version');
    return true;
  } catch {
    return false;
  }
}

// 主流程
async function main() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:T]/g, '_').split('.')[0];
  const filename = `backup_${timestamp}.gz`;
  const localPath = path.join(BACKUP_DIR, filename);
  const s3Key = `backups/db/${filename}`;

  console.log(`\n🚀 开始数据库备份: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`🔗 MongoDB URI: ${maskUri(MONGODB_URI)}`);
  console.log(`📂 备份目录: ${BACKUP_DIR}`);
  console.log(`📅 保留策略: ${BACKUP_RETENTION_DAYS} 天`);

  if (!MONGODB_URI) {
    console.error('\n❌ 错误: MONGODB_URI 未设置，无法备份');
    process.exit(1);
  }

  // 检查 mongodump
  if (!await checkMongodump()) {
    console.error('\n❌ 错误: 未找到 mongodump 命令');
    console.error('   请安装 MongoDB Database Tools:');
    console.error('   - Ubuntu/Debian: sudo apt-get install mongodb-database-tools');
    console.error('   - CentOS/RHEL:  sudo yum install mongodb-database-tools');
    console.error('   - 或者从官网下载: https://www.mongodb.com/try/download/database-tools');
    process.exit(1);
  }

  await ensureDir(BACKUP_DIR);

  try {
    // 1. 执行 mongodump
    console.log('\n⏳ 正在执行 mongodump...');
    const cmd = `mongodump --uri="${MONGODB_URI}" --archive="${localPath}" --gzip`;
    const { stderr } = await execPromise(cmd);
    if (stderr) console.log('   mongodump stderr:', stderr.trim());

    const stat = await fs.stat(localPath);
    console.log(`✅ 备份完成: ${filename} (${formatBytes(stat.size)})`);

    // 2. 上传到 S3
    await uploadToS3(localPath, s3Key);

    // 3. 清理旧备份
    console.log('\n⏳ 清理旧备份...');
    await cleanLocalBackups();
    await cleanS3Backups();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 备份任务成功完成，耗时 ${duration} 秒\n`);
  } catch (error) {
    console.error('\n❌ 备份失败:', error.message);
    if (error.stderr) console.error('   stderr:', error.stderr.trim());
    if (error.stdout) console.error('   stdout:', error.stdout.trim());

    // 清理失败的临时文件
    try { await fs.unlink(localPath); } catch {}

    console.error('\n💡 常见原因:');
    console.error('   1. MongoDB 连接失败（检查 MONGODB_URI）');
    console.error('   2. mongodump 权限不足');
    console.error('   3. 磁盘空间不足');
    process.exit(1);
  }
}

main();
