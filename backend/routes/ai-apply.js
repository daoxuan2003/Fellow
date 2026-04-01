// ============================================
// AI 方案应用路由
// 将 AI 生成的方案应用到实际计划中
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Habit = require('../models/Habit');
const User = require('../models/User');

/**
 * @route   POST /api/ai/apply-plan
 * @desc    应用 AI 生成的方案
 * @access  Private
 * 
 * 请求体：
 * {
 *   targetType: 'new' | 'replace' | 'update',
 *   targetHabitId?: string,  // replace 或 update 时需要
 *   plan: {
 *     planName: string,
 *     description?: string,
 *     type: 'simple' | 'subtasks' | 'numeric',
 *     frequency: 'daily' | 'weekly',
 *     weekdays?: number[],
 *     subTasks?: Array<{title: string, weekday?: number}>,
 *     numericConfig?: { unit: string, targetValue: number },
 *     tips?: string[]
 *   }
 * }
 */
router.post('/apply-plan', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { targetType, targetHabitId, plan } = req.body;

    if (!plan || !targetType) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: '请先绑定伴侣' 
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    // 根据目标类型执行不同操作
    let result;
    switch (targetType) {
      case 'new':
        result = await createNewHabit(userId, coupleId, plan);
        break;
      case 'replace':
        if (!targetHabitId) {
          return res.status(400).json({ 
            success: false, 
            message: '替换模式需要提供目标计划ID' 
          });
        }
        result = await replaceHabit(targetHabitId, userId, coupleId, plan);
        break;
      case 'update':
        if (!targetHabitId) {
          return res.status(400).json({ 
            success: false, 
            message: '更新模式需要提供目标计划ID' 
          });
        }
        result = await updateHabit(targetHabitId, userId, plan);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: '未知的目标类型' 
        });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.habit
    });

  } catch (error) {
    console.error('应用 AI 方案失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '应用方案失败: ' + error.message 
    });
  }
});

/**
 * 创建新计划
 */
async function createNewHabit(userId, coupleId, plan) {
  // 转换子任务格式
  const subTasks = (plan.subTasks || []).map((task, index) => ({
    id: `task_${Date.now()}_${index}`,
    title: typeof task === 'string' ? task : task.title,
    weekday: task.weekday,
    completed: false
  }));

  const habit = new Habit({
    coupleId,
    createdBy: userId,
    title: plan.planName,
    description: plan.description || `由 AI 助手生成的${plan.planName}计划`,
    type: plan.type || 'simple',
    frequency: plan.frequency || 'daily',
    weekdays: plan.weekdays,
    subTasks: subTasks.length > 0 ? subTasks : undefined,
    numericConfig: plan.numericConfig,
    participation: 'both', // 默认双人计划
    status: 'active'
  });

  await habit.save();

  return {
    message: `成功创建计划「${plan.planName}」`,
    habit: habit.toObject()
  };
}

/**
 * 替换现有计划（删除旧的，创建新的）
 */
async function replaceHabit(habitId, userId, coupleId, plan) {
  // 查找原计划
  const oldHabit = await Habit.findOne({ 
    _id: habitId, 
    createdBy: userId 
  });

  if (!oldHabit) {
    throw new Error('原计划不存在或无权限');
  }

  const oldTitle = oldHabit.title;

  // 删除原计划（软删除或标记为 replaced）
  oldHabit.status = 'completed';
  oldHabit.completedAt = new Date();
  oldHabit.completedBy = userId;
  await oldHabit.save();

  // 创建新计划
  const result = await createNewHabit(userId, coupleId, {
    ...plan,
    description: `${plan.description || ''}\n（由「${oldTitle}」替换而来）`.trim()
  });

  return {
    message: `已将「${oldTitle}」替换为「${plan.planName}」`,
    habit: result.habit
  };
}

/**
 * 更新现有计划（保留打卡记录，只改配置）
 */
async function updateHabit(habitId, userId, plan) {
  const habit = await Habit.findOne({ 
    _id: habitId, 
    createdBy: userId 
  });

  if (!habit) {
    throw new Error('计划不存在或无权限');
  }

  // 转换子任务
  const subTasks = (plan.subTasks || []).map((task, index) => ({
    id: `task_${Date.now()}_${index}`,
    title: typeof task === 'string' ? task : task.title,
    weekday: task.weekday,
    completed: false
  }));

  // 更新字段
  if (plan.planName) habit.title = plan.planName;
  if (plan.description) habit.description = plan.description;
  if (plan.type) habit.type = plan.type;
  if (plan.frequency) habit.frequency = plan.frequency;
  if (plan.weekdays) habit.weekdays = plan.weekdays;
  if (subTasks.length > 0) habit.subTasks = subTasks;
  if (plan.numericConfig) habit.numericConfig = plan.numericConfig;
  
  habit.updatedAt = new Date();
  await habit.save();

  return {
    message: `成功更新计划「${habit.title}」`,
    habit: habit.toObject()
  };
}

module.exports = router;
