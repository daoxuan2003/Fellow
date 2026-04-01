// ============================================
// AI 数据收集中间件
// 在关键操作时实时收集数据
// ============================================

const collector = require('./collector');

/**
 * 打卡后收集数据
 */
async function collectAfterCheckIn(req, res, next) {
  // 保存原始的 res.json
  const originalJson = res.json;
  
  res.json = function(data) {
    // 如果打卡成功，异步收集数据
    if (data.success && req.userId) {
      setImmediate(async () => {
        try {
          // 收集本次打卡详情
          if (data.data && data.data._id) {
            await collector.collectCheckInDetail(data.data._id);
          }
          
          // 更新计划分析数据
          if (req.params.id) {
            await collector.collectHabitAnalytics(req.params.id, req.userId);
          }
          
          console.log('✅ AI 数据收集完成');
        } catch (e) {
          console.error('AI 数据收集失败:', e.message);
        }
      });
    }
    
    // 调用原始的 res.json
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * 创建计划后收集数据
 */
async function collectAfterCreateHabit(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data.success && data.data && req.userId) {
      setImmediate(async () => {
        try {
          // 收集用户画像（更新计划数量）
          await collector.collectUserProfile(req.userId);
          
          console.log('✅ 创建计划数据收集完成');
        } catch (e) {
          console.error('创建计划数据收集失败:', e.message);
        }
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * 用户登录后收集数据
 */
async function collectAfterLogin(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data.success && data.user && data.user._id) {
      const userId = data.user._id.toString();
      
      setImmediate(async () => {
        try {
          // 收集完整的用户画像
          await collector.collectUserProfile(userId);
          
          console.log('✅ 用户登录数据收集完成');
        } catch (e) {
          console.error('用户登录数据收集失败:', e.message);
        }
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

module.exports = {
  collectAfterCheckIn,
  collectAfterCreateHabit,
  collectAfterLogin
};
