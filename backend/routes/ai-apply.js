// ============================================
// AI 方案应用路由
// 将 AI 生成的方案应用到实际计划中
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Habit = require('../models/Habit');
const User = require('../models/User');
const { logError } = require('../utils/safeLogger');

class PlanApplyError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PlanApplyError';
    this.statusCode = statusCode;
  }
}

function emitHabitSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'habitSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function buildHabitPayload(habit) {
  const raw = typeof habit.toObject === 'function' ? habit.toObject() : habit;
  return {
    id: raw._id || raw.id,
    title: raw.title,
    description: raw.description,
    icon: raw.icon,
    color: raw.color,
    type: raw.type,
    participation: raw.participation,
    targetDays: raw.targetDays,
    frequency: raw.frequency,
    weekdays: raw.weekdays,
    subTasks: raw.subTasks,
    numericConfig: raw.numericConfig,
    status: raw.status,
    startDate: raw.startDate,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
}

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
        result = await updateHabit(targetHabitId, userId, coupleId, plan);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: '未知的目标类型' 
        });
    }

    for (const event of result.syncEvents || []) {
      emitHabitSync(req.app, coupleId, {
        ...event,
        actor: userId,
        requestId: req.body.requestId
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.habit
    });

  } catch (error) {
    if (error instanceof PlanApplyError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
    logError('应用 AI 方案失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '应用方案失败，请稍后再试'
    });
  }
});

/**
 * 数据清洗：处理 AI 可能输出的不规范格式
 */
function sanitizePlan(plan) {
  // 1. 处理 frequency
  let frequency = plan.frequency || 'weekly';
  if (typeof frequency === 'string') {
    if (frequency.includes('天') || frequency === 'daily') {
      frequency = 'daily';
    } else {
      frequency = 'weekly';
    }
  }

  // 2. 处理 weekdays：可能是 ["周一", "周三"]
  let weekdays = plan.weekdays || [1, 3, 5];
  const weekdayMap = {
    '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6,
    '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6
  };
  
  if (Array.isArray(weekdays)) {
    weekdays = weekdays.map(day => {
      if (typeof day === 'number') return day;
      if (typeof day === 'string') {
        return weekdayMap[day] !== undefined ? weekdayMap[day] : (parseInt(day) || 1);
      }
      return 1;
    }).filter(d => d >= 0 && d <= 6);
  }
  
  if (weekdays.length === 0) {
    weekdays = [1, 3, 5];
  }

  // 3. 处理子任务：兼容可能的字段名
  let subTasks = (plan.subTasks || []).map((task, index) => {
    if (typeof task === 'string') {
      return {
        id: `task_${Date.now()}_${index}`,
        title: task,
        completed: false
      };
    }
    
    // 兼容各种可能的字段名
    const title = task.title || task.task || task.taskName || task.name || `任务${index + 1}`;
    const weekday = task.weekday !== undefined ? task.weekday : null;
    
    const result = {
      id: `task_${Date.now()}_${index}`,
      title,
      completed: false
    };
    
    if (weekday !== null && weekday >= 0 && weekday <= 6) {
      result.weekday = weekday;
    }
    
    return result;
  }).slice(0, 20); // 最多20个任务

  return {
    planName: plan.planName || '未命名计划',
    description: plan.description || '',
    type: plan.type || (subTasks.length > 0 ? 'subtasks' : 'simple'),
    frequency,
    weekdays,
    subTasks,
    numericConfig: plan.numericConfig || plan.numericTarget,
    tips: plan.tips || []
  };
}

/**
 * 创建新计划
 */
async function createNewHabit(userId, coupleId, plan) {
  // 清洗数据
  const cleanPlan = sanitizePlan(plan);

  const habit = new Habit({
    coupleId,
    createdBy: userId,
    title: cleanPlan.planName,
    description: cleanPlan.description || `由 AI 助手生成的${cleanPlan.planName}计划`,
    type: cleanPlan.type,
    frequency: cleanPlan.frequency,
    weekdays: cleanPlan.weekdays,
    subTasks: cleanPlan.subTasks.length > 0 ? cleanPlan.subTasks : undefined,
    numericConfig: cleanPlan.numericConfig,
    participation: 'both', // 默认双人计划
    status: 'active'
  });

  await habit.save();

  return {
    message: `成功创建计划「${cleanPlan.planName}」`,
    habit: habit.toObject(),
    syncEvents: [{
      action: 'create',
      payload: buildHabitPayload(habit)
    }]
  };
}

/**
 * 替换现有计划（删除旧的，创建新的）
 */
async function replaceHabit(habitId, userId, coupleId, plan) {
  // 查找原计划
  const oldHabit = await Habit.findOne({ 
    _id: habitId,
    coupleId,
    createdBy: userId 
  });

  if (!oldHabit) {
    throw new PlanApplyError('原计划不存在或无权限', 404);
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
    habit: result.habit,
    syncEvents: [
      {
        action: 'archive',
        payload: {
          id: oldHabit._id,
          title: oldHabit.title,
          status: oldHabit.status,
          completedAt: oldHabit.completedAt,
          completedBy: oldHabit.completedBy
        }
      },
      ...(result.syncEvents || [])
    ]
  };
}

/**
 * 更新现有计划（保留打卡记录，只改配置）
 */
async function updateHabit(habitId, userId, coupleId, plan) {
  const habit = await Habit.findOne({ 
    _id: habitId,
    coupleId,
    createdBy: userId 
  });

  if (!habit) {
    throw new PlanApplyError('计划不存在或无权限', 404);
  }

  // 清洗数据
  const cleanPlan = sanitizePlan(plan);

  // 更新字段
  if (cleanPlan.planName) habit.title = cleanPlan.planName;
  if (cleanPlan.description) habit.description = cleanPlan.description;
  if (cleanPlan.type) habit.type = cleanPlan.type;
  if (cleanPlan.frequency) habit.frequency = cleanPlan.frequency;
  if (cleanPlan.weekdays) habit.weekdays = cleanPlan.weekdays;
  if (cleanPlan.subTasks.length > 0) habit.subTasks = cleanPlan.subTasks;
  if (cleanPlan.numericConfig) habit.numericConfig = cleanPlan.numericConfig;
  
  habit.updatedAt = new Date();
  await habit.save();

  return {
    message: `成功更新计划「${habit.title}」`,
    habit: habit.toObject(),
    syncEvents: [{
      action: 'update',
      payload: buildHabitPayload(habit)
    }]
  };
}

module.exports = router;
