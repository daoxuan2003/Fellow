// ============================================
// 成就系统服务
// ============================================

const { User, Habit, CheckIn, Achievement } = require('../models');
const { ACHIEVEMENTS } = require('../utils/achievementConfig');

const ONE_HOUR = 60 * 60 * 1000;
const MAX_MIGRATION_ENTRIES = 100;
const ACHIEVEMENT_CONFIG_MAP = new Map(ACHIEVEMENTS.map(config => [config.id, config]));

// 获取日期字符串 YYYY-MM-DD
function getDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 计算连续打卡天数（简化版，按自然天）
function calculateMaxStreak(checkIns, userId) {
  const dates = [...new Set(checkIns.filter(c => c.userId === userId).map(c => c.date))].sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) return 0;
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate = null;
  
  for (const dateStr of dates) {
    const date = new Date(dateStr);
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const diff = Math.floor((lastDate - date) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    lastDate = date;
  }
  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}

// 计算双方共同完成的连续天数
function calculateBothStreak(bothDates) {
  if (!bothDates || bothDates.length === 0) return 0;
  const sorted = [...bothDates].sort((a, b) => b.localeCompare(a));
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate = null;
  
  for (const dateStr of sorted) {
    const date = new Date(dateStr);
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const diff = Math.floor((lastDate - date) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    lastDate = date;
  }
  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}

// 检查完美一周（最近7天每天都打卡）
function checkPerfectWeek(checkIns, userId) {
  const dates = new Set(checkIns.filter(c => c.userId === userId).map(c => c.date));
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(getDateStr(d));
  }
  return last7Days.every(day => dates.has(day));
}

// 检查一周内所有双人计划都一起完成
function checkPerfectPartnerWeek(habits, checkIns, userId, partnerId) {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  const bothHabits = habits.filter(h => h.participation === 'both' && h.status !== 'completed');
  if (bothHabits.length === 0) return false;
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getDateStr(d);
    
    for (const habit of bothHabits) {
      // 检查这天是否需要打卡
      let needCheckIn = true;
      if (habit.startDate && dateStr < habit.startDate) needCheckIn = false;
      if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
        needCheckIn = habit.weekdays.map(Number).includes(d.getDay());
      }
      if (!needCheckIn) continue;
      
      // 检查请假
      const leaves = habit.leaves || [];
      const myLeave = leaves.some(l => l.userId === userId && dateStr >= l.startDate && dateStr <= l.endDate);
      const partnerLeave = leaves.some(l => l.userId === partnerId && dateStr >= l.startDate && dateStr <= l.endDate);
      if (myLeave || partnerLeave) continue;
      
      const myCheck = checkIns.some(c => c.habitId.toString() === habit._id.toString() && c.userId === userId && c.date === dateStr);
      const partnerCheck = checkIns.some(c => c.habitId.toString() === habit._id.toString() && c.userId === partnerId && c.date === dateStr);
      if (!myCheck || !partnerCheck) return false;
    }
  }
  return true;
}

// 计算互相监督次数（同一天同个计划1小时内都完成）
async function calculateSyncCompleteCount(coupleId, userId, partnerId) {
  const habits = await Habit.find({ coupleId, participation: 'both' });
  let count = 0;
  
  for (const habit of habits) {
    const myCheckIns = await CheckIn.find({ habitId: habit._id, userId });
    const partnerCheckIns = await CheckIn.find({ habitId: habit._id, userId: partnerId });
    
    for (const my of myCheckIns) {
      const partner = partnerCheckIns.find(p => p.date === my.date);
      if (partner) {
        const diff = Math.abs(new Date(my.createdAt).getTime() - new Date(partner.createdAt).getTime());
        if (diff <= ONE_HOUR) {
          count++;
        }
      }
    }
  }
  return count;
}

// 检查镜像连续
function checkMirrorStreak(myMaxStreak, partnerMaxStreak) {
  return myMaxStreak >= 7 && partnerMaxStreak >= 7;
}

// 检查周末不躺平（连续4个周末都打卡）
function checkWeekendWarrior(checkIns, userId) {
  const dates = new Set(checkIns.filter(c => c.userId === userId).map(c => c.date));
  const today = new Date();
  
  for (let i = 0; i < 4; i++) {
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - today.getDay() - 6 - (i * 7));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    const satStr = getDateStr(saturday);
    const sunStr = getDateStr(sunday);
    
    if (!dates.has(satStr) && !dates.has(sunStr)) return false;
  }
  return true;
}

// 检查王者归来（断签后重新连续7天）
function checkComeback(checkIns, userId) {
  const dates = [...new Set(checkIns.filter(c => c.userId === userId).map(c => c.date))].sort((a, b) => a.localeCompare(b));
  if (dates.length < 8) return false;
  
  for (let i = 7; i < dates.length; i++) {
    // 检查 i-6 到 i 是否连续7天
    let streak = 1;
    for (let j = i - 6; j <= i; j++) {
      const prev = new Date(dates[j - 1]);
      const curr = new Date(dates[j]);
      const diff = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak++;
      else break;
    }
    if (streak >= 7) {
      // 检查这7天之前是否有断签（至少空1天）
      const before = new Date(dates[i - 7]);
      const start = new Date(dates[i - 6]);
      const diff = Math.floor((start - before) / (1000 * 60 * 60 * 24));
      if (diff > 1) return true;
    }
  }
  return false;
}

// 计算活跃计划数
function countActiveHabits(habits, checkIns, userId, todayStr) {
  return habits.filter(h => {
    return checkIns.some(c => c.habitId.toString() === h._id.toString() && c.userId === userId && c.date === todayStr);
  }).length;
}

// 计算使用过的类型
function getUsedTypes(habits, userId) {
  const created = habits.filter(h => h.createdBy === userId);
  return {
    simple: created.some(h => h.type === 'simple'),
    subtasks: created.some(h => h.type === 'subtasks'),
    numeric: created.some(h => h.type === 'numeric')
  };
}

// 构建用户统计数据
async function buildStats(userId, coupleId) {
  const user = await User.findById(userId);
  const partnerId = user?.partnerId;
  
  const habits = await Habit.find({ coupleId });
  const habitIds = habits.map(h => h._id);
  const checkIns = await CheckIn.find({ habitId: { $in: habitIds } });
  
  const myCheckIns = checkIns.filter(c => c.userId === userId);
  const partnerCheckIns = partnerId ? checkIns.filter(c => c.userId === partnerId) : [];
  
  const totalCheckInDays = [...new Set(myCheckIns.map(c => c.date))].length;
  const maxStreak = calculateMaxStreak(checkIns, userId);
  const partnerMaxStreak = partnerId ? calculateMaxStreak(checkIns, partnerId) : 0;
  
  // 双方共同完成
  const bothHabits = habits.filter(h => h.participation === 'both');
  let bothCompletedCount = 0;
  const bothDates = new Set();
  for (const h of bothHabits) {
    const myDates = new Set(myCheckIns.filter(c => c.habitId.toString() === h._id.toString()).map(c => c.date));
    const pDates = new Set(partnerCheckIns.filter(c => c.habitId.toString() === h._id.toString()).map(c => c.date));
    for (const d of myDates) {
      if (pDates.has(d)) {
        bothCompletedCount++;
        bothDates.add(d);
      }
    }
  }
  
  const syncCompleteCount = partnerId ? await calculateSyncCompleteCount(coupleId, userId, partnerId) : 0;
  
  // 已解锁成就数
  const unlockedAchievements = await Achievement.find({ userId, unlockedAt: { $ne: null } });
  const unlockedCount = unlockedAchievements.length;
  
  const todayStr = getDateStr();
  
  return {
    totalCheckIns: myCheckIns.length,
    totalCheckInDays,
    maxStreak,
    bothCompletedCount,
    bothStreak: calculateBothStreak([...bothDates]),
    perfectPartnerWeek: partnerId ? checkPerfectPartnerWeek(habits, checkIns, userId, partnerId) : false,
    syncCompleteCount,
    mirrorStreak: partnerId ? checkMirrorStreak(maxStreak, partnerMaxStreak) : false,
    activeHabits: countActiveHabits(habits, checkIns, userId, todayStr),
    createdHabits: habits.filter(h => h.createdBy === userId).length,
    usedTypes: getUsedTypes(habits, userId),
    numericCheckIns: myCheckIns.filter(c => {
      const habit = habits.find(h => h._id.toString() === c.habitId.toString());
      return habit?.type === 'numeric';
    }).length,
    perfectSubtaskCount: myCheckIns.filter(c => {
      const habit = habits.find(h => h._id.toString() === c.habitId.toString());
      return habit?.type === 'subtasks' && c.isPerfect;
    }).length,
    earlyCheckIn: myCheckIns.some(c => new Date(c.createdAt).getHours() < 7),
    nightCheckIn: myCheckIns.some(c => new Date(c.createdAt).getHours() >= 22),
    weekendWarrior: checkWeekendWarrior(checkIns, userId),
    comeback: checkComeback(checkIns, userId),
    completedHabits: habits.filter(h => h.status === 'completed' && h.createdBy === userId).length,
    perfectWeek: checkPerfectWeek(checkIns, userId),
    unlockedCount
  };
}

// 检查成就
async function checkAchievements(userId, coupleId) {
  const stats = await buildStats(userId, coupleId);
  const newUnlocks = [];
  const progressUpdates = [];
  
  for (const config of ACHIEVEMENTS) {
    let achievement = await Achievement.findOne({ userId, achievementId: config.id });
    if (!achievement) {
      achievement = new Achievement({
        userId,
        coupleId,
        achievementId: config.id,
        progress: 0,
        unlockedAt: null
      });
    }
    
    // 已解锁的跳过
    if (achievement.unlockedAt) continue;
    
    // 计算进度
    let progress = 0;
    switch (config.id) {
      case 'first_checkin':
      case 'both_first':
      case 'multi_habit':
      case 'habit_creator':
      case 'completer':
      case 'early_bird':
      case 'night_owl':
      case 'weekend_warrior':
      case 'comeback':
      case 'mirror_streak':
      case 'both_perfect_week':
      case 'perfect_week':
      case 'type_explorer':
      case 'legendary_couple':
        progress = config.condition(stats) ? 1 : 0;
        break;
      case 'streak_3':
      case 'streak_7':
      case 'streak_21':
      case 'streak_30':
      case 'streak_66':
      case 'streak_100':
        progress = Math.min(stats.maxStreak, config.maxProgress);
        break;
      case 'total_365':
        progress = Math.min(stats.totalCheckInDays, config.maxProgress);
        break;
      case 'both_week':
      case 'both_month':
        progress = Math.min(stats.bothStreak, config.maxProgress);
        break;
      case 'encourager':
        progress = Math.min(stats.syncCompleteCount, config.maxProgress);
        break;
      case 'numeric_master':
        progress = Math.min(stats.numericCheckIns, config.maxProgress);
        break;
      case 'subtask_perfect':
        progress = Math.min(stats.perfectSubtaskCount, config.maxProgress);
        break;
      default:
        progress = config.condition(stats) ? 1 : 0;
    }
    
    achievement.progress = progress;
    
    // 解锁
    if (config.condition(stats)) {
      achievement.unlockedAt = new Date();
      newUnlocks.push({
        ...config,
        progress,
        unlockedAt: achievement.unlockedAt
      });
    }
    
    await achievement.save();
    progressUpdates.push({ achievementId: config.id, progress, unlockedAt: achievement.unlockedAt });
  }
  
  return { newUnlocks, progressUpdates, stats };
}

// 获取用户成就列表
async function getUserAchievements(userId, coupleId) {
  const configs = ACHIEVEMENTS;
  const records = await Achievement.find({ userId });
  const recordMap = new Map(records.map(r => [r.achievementId, r]));
  
  // 如果记录不存在，自动初始化
  const missing = configs.filter(c => !recordMap.has(c.id));
  for (const config of missing) {
    const ach = new Achievement({ userId, coupleId, achievementId: config.id, progress: 0 });
    await ach.save();
    recordMap.set(config.id, ach);
  }
  
  return configs.map(config => {
    const record = recordMap.get(config.id);
    return {
      id: config.id,
      category: config.category,
      rarity: config.rarity,
      title: config.title,
      description: config.description,
      icon: config.icon,
      maxProgress: config.maxProgress,
      points: config.points,
      progress: record?.progress || 0,
      unlockedAt: record?.unlockedAt || null
    };
  });
}

// 迁移 localStorage 数据（一次性）
async function migrateAchievements(userId, coupleId, unlockedMap) {
  const results = [];
  const entries = Object.entries(unlockedMap || {}).slice(0, MAX_MIGRATION_ENTRIES);
  const now = Date.now();

  for (const [achievementId, unlockedAt] of entries) {
    const config = ACHIEVEMENT_CONFIG_MAP.get(achievementId);
    if (!config) continue;
    const unlockedDate = new Date(unlockedAt);
    if (Number.isNaN(unlockedDate.getTime()) || unlockedDate.getTime() > now) continue;
    
    let ach = await Achievement.findOne({ userId, achievementId });
    if (!ach) {
      ach = new Achievement({ userId, coupleId, achievementId, progress: config.maxProgress });
    }
    if (!ach.unlockedAt) {
      ach.unlockedAt = unlockedDate;
      ach.progress = config.maxProgress;
      await ach.save();
      results.push(achievementId);
    }
  }
  return results;
}

module.exports = {
  checkAchievements,
  getUserAchievements,
  migrateAchievements,
  buildStats
};
