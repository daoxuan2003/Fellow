// ============================================
// AI 数据收集定时任务
// ============================================

const collector = require('./collector');
const User = require('../../models/User');

class DataCollectionScheduler {
  constructor() {
    this.isRunning = false;
  }

  // 启动定时任务
  start() {
    console.log('🤖 AI 数据收集调度器已启动');
    
    // 每日凌晨 2 点导出前一天的数据
    this.scheduleDailyExport();
    
    // 每周一凌晨 3 点生成周报告
    this.scheduleWeeklyReport();
  }

  // 每日导出
  scheduleDailyExport() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const msUntilTomorrow = tomorrow - now;
    
    setTimeout(() => {
      this.runDailyExport();
      // 之后每 24 小时执行一次
      setInterval(() => this.runDailyExport(), 24 * 60 * 60 * 1000);
    }, msUntilTomorrow);
    
    console.log(`📅 每日数据导出安排在 ${tomorrow.toLocaleString()}`);
  }

  // 每周报告
  scheduleWeeklyReport() {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
    nextMonday.setHours(3, 0, 0, 0);
    
    const msUntilMonday = nextMonday - now;
    
    setTimeout(() => {
      this.runWeeklyReport();
      // 之后每 7 天执行一次
      setInterval(() => this.runWeeklyReport(), 7 * 24 * 60 * 60 * 1000);
    }, msUntilMonday);
    
    console.log(`📊 周报告生成安排在 ${nextMonday.toLocaleString()}`);
  }

  // 执行每日导出
  async runDailyExport() {
    if (this.isRunning) {
      console.log('⚠️ 数据导出任务已在运行，跳过');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 开始每日 AI 数据导出...');
    
    try {
      // 获取所有活跃用户（最近 7 天有登录）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const users = await User.find({
        lastLoginAt: { $gte: sevenDaysAgo }
      }).select('_id').lean();
      
      console.log(`📊 需要导出 ${users.length} 个用户的数据`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const user of users) {
        try {
          await collector.exportUserData(user._id);
          successCount++;
          
          // 避免请求过快，添加延迟
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`导出用户 ${user._id} 数据失败:`, e.message);
          failCount++;
        }
      }
      
      console.log(`✅ 每日导出完成: ${successCount} 成功, ${failCount} 失败`);
    } catch (e) {
      console.error('每日导出任务失败:', e);
    } finally {
      this.isRunning = false;
    }
  }

  // 执行周报告生成
  async runWeeklyReport() {
    console.log('📊 开始生成周报告...');
    
    try {
      // 这里可以添加周报告生成逻辑
      // 比如汇总本周数据，生成趋势分析等
      
      console.log('✅ 周报告生成完成');
    } catch (e) {
      console.error('周报告生成失败:', e);
    }
  }

  // 手动触发导出（用于测试）
  async manualExport(userId) {
    console.log(`🚀 手动导出用户 ${userId} 的数据`);
    return await collector.exportUserData(userId);
  }
}

module.exports = new DataCollectionScheduler();
