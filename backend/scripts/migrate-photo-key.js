// ============================================
// 迁移脚本：从 photoUrl 提取 photoKey
// 运行方式：node scripts/migrate-photo-key.js
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');
const { Cosmetic } = require('../models');

async function migrate() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 找到所有没有 photoKey 但有 photoUrl 的记录
    const cosmetics = await Cosmetic.find({
      $or: [
        { photoKey: { $exists: false } },
        { photoKey: null },
        { photoKey: '' }
      ]
    });
    
    console.log(`📊 找到 ${cosmetics.length} 条需要迁移的记录`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const cosmetic of cosmetics) {
      try {
        let photoKey = '';
        
        if (cosmetic.photoUrl) {
          // 如果是预签名 URL，提取 key 部分
          // URL 格式如：https://xxx.com/bucket/couples/xxx/cosmetics/xxx.jpg?X-Amz-...
          const url = cosmetic.photoUrl;
          
          // 尝试从 URL 中提取 key
          // 1. 移除查询参数
          const urlWithoutParams = url.split('?')[0];
          
          // 2. 提取路径部分（移除域名和 bucket 名）
          // 可能的格式：
          // - https://xxx.com/bucketname/couples/xxx/cosmetics/xxx.jpg
          // - https://bucketname.xxx.com/couples/xxx/cosmetics/xxx.jpg
          // - https://xxx.com/couples/xxx/cosmetics/xxx.jpg (本地存储)
          
          const urlPattern = /\/couples\/[^/]+\/cosmetics\/[^/]+$/;
          const match = urlWithoutParams.match(urlPattern);
          
          if (match) {
            photoKey = match[0].substring(1); // 移除开头的 /
          } else {
            // 尝试其他模式
            const simpleMatch = urlWithoutParams.match(/couples\/.+$/);
            if (simpleMatch) {
              photoKey = simpleMatch[0];
            }
          }
        }
        
        if (photoKey) {
          cosmetic.photoKey = photoKey;
          await cosmetic.save();
          console.log(`✅ 已迁移: ${cosmetic._id} -> ${photoKey}`);
          migrated++;
        } else {
          console.log(`❌ 无法提取 key: ${cosmetic._id}, URL: ${cosmetic.photoUrl?.substring(0, 100)}...`);
          failed++;
        }
      } catch (err) {
        console.error(`❌ 迁移失败 ${cosmetic._id}:`, err.message);
        failed++;
      }
    }
    
    console.log('\n📊 迁移结果:');
    console.log(`   成功: ${migrated}`);
    console.log(`   失败: ${failed}`);
    console.log(`   总计: ${cosmetics.length}`);
    
  } catch (error) {
    console.error('❌ 迁移出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 数据库连接已关闭');
  }
}

migrate();
