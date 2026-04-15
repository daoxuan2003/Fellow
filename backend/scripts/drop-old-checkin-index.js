// ============================================
// 迁移脚本：删除 checkins 集合中残留的旧索引 planId_1_userId_1_date_1
// 该索引会导致新记录插入时因 planId 缺失（视为 null）而触发重复键错误
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;
    const collection = db.collection('checkins');
    const indexes = await collection.indexes();

    const oldIndex = indexes.find(idx => idx.name === 'planId_1_userId_1_date_1');
    if (oldIndex) {
      await collection.dropIndex('planId_1_userId_1_date_1');
      console.log('✅ 已删除旧索引 planId_1_userId_1_date_1');
    } else {
      console.log('ℹ️ 旧索引 planId_1_userId_1_date_1 不存在，无需清理');
    }

    await mongoose.disconnect();
    console.log('✅ 迁移完成');
    process.exit(0);
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  }
}

migrate();
