// ============================================
// 成就系统配置
// ============================================

const ACHIEVEMENTS = [
  // ========== 个人里程碑 ==========
  {
    id: 'first_checkin',
    category: 'milestone',
    rarity: 'common',
    title: '初见成效',
    description: '完成第一次打卡',
    icon: '🌱',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.totalCheckIns >= 1
  },
  {
    id: 'streak_3',
    category: 'milestone',
    rarity: 'common',
    title: '小火苗',
    description: '连续打卡 3 天',
    icon: '🔥',
    maxProgress: 3,
    points: 10,
    condition: (stats) => stats.maxStreak >= 3
  },
  {
    id: 'streak_7',
    category: 'milestone',
    rarity: 'common',
    title: '一周战士',
    description: '连续打卡 7 天',
    icon: '⚡',
    maxProgress: 7,
    points: 10,
    condition: (stats) => stats.maxStreak >= 7
  },
  {
    id: 'streak_21',
    category: 'milestone',
    rarity: 'rare',
    title: '习惯养成',
    description: '连续打卡 21 天',
    icon: '🌟',
    maxProgress: 21,
    points: 30,
    condition: (stats) => stats.maxStreak >= 21
  },
  {
    id: 'streak_30',
    category: 'milestone',
    rarity: 'rare',
    title: '钢铁意志',
    description: '连续打卡 30 天',
    icon: '👑',
    maxProgress: 30,
    points: 30,
    condition: (stats) => stats.maxStreak >= 30
  },
  {
    id: 'streak_66',
    category: 'milestone',
    rarity: 'epic',
    title: '百日筑基',
    description: '连续打卡 66 天',
    icon: '💎',
    maxProgress: 66,
    points: 80,
    condition: (stats) => stats.maxStreak >= 66
  },
  {
    id: 'streak_100',
    category: 'milestone',
    rarity: 'epic',
    title: '百日坚持',
    description: '连续打卡 100 天',
    icon: '🏅',
    maxProgress: 100,
    points: 80,
    condition: (stats) => stats.maxStreak >= 100
  },
  {
    id: 'total_365',
    category: 'milestone',
    rarity: 'legendary',
    title: '年复一年',
    description: '累计打卡 365 天',
    icon: '🌍',
    maxProgress: 365,
    points: 200,
    condition: (stats) => stats.totalCheckInDays >= 365
  },

  // ========== 双人默契 ==========
  {
    id: 'both_first',
    category: 'couple',
    rarity: 'common',
    title: '第一次同框',
    description: '和 TA 第一次共同完成计划',
    icon: '💕',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.bothCompletedCount >= 1
  },
  {
    id: 'both_week',
    category: 'couple',
    rarity: 'rare',
    title: '一周同框',
    description: '和 TA 连续 7 天共同完成',
    icon: '🤝',
    maxProgress: 7,
    points: 30,
    condition: (stats) => stats.bothStreak >= 7
  },
  {
    id: 'both_month',
    category: 'couple',
    rarity: 'epic',
    title: '满月默契',
    description: '和 TA 连续 30 天共同完成',
    icon: '🌙',
    maxProgress: 30,
    points: 80,
    condition: (stats) => stats.bothStreak >= 30
  },
  {
    id: 'both_perfect_week',
    category: 'couple',
    rarity: 'rare',
    title: '完美拍档',
    description: '一周内所有双人计划都一起完成',
    icon: '🎯',
    maxProgress: 1,
    points: 30,
    condition: (stats) => stats.perfectPartnerWeek
  },
  {
    id: 'encourager',
    category: 'couple',
    rarity: 'rare',
    title: '互相监督',
    description: '一方完成 1 小时内另一方也完成，累计 10 次',
    icon: '⏰',
    maxProgress: 10,
    points: 30,
    condition: (stats) => stats.syncCompleteCount >= 10
  },
  {
    id: 'mirror_streak',
    category: 'couple',
    rarity: 'epic',
    title: '镜像连续',
    description: '两人同时保持 7 天以上连续打卡',
    icon: '🪞',
    maxProgress: 1,
    points: 80,
    condition: (stats) => stats.mirrorStreak
  },

  // ========== 计划探索 ==========
  {
    id: 'multi_habit',
    category: 'explorer',
    rarity: 'common',
    title: '多面手',
    description: '同时保持 3 个活跃计划',
    icon: '📚',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.activeHabits >= 3
  },
  {
    id: 'habit_creator',
    category: 'explorer',
    rarity: 'common',
    title: '计划发起人',
    description: '累计创建 5 个计划',
    icon: '🚀',
    maxProgress: 5,
    points: 10,
    condition: (stats) => stats.createdHabits >= 5
  },
  {
    id: 'type_explorer',
    category: 'explorer',
    rarity: 'rare',
    title: '全能选手',
    description: '使用过简单打卡、子任务、数值记录三种类型',
    icon: '🎨',
    maxProgress: 1,
    points: 30,
    condition: (stats) => stats.usedTypes.simple && stats.usedTypes.subtasks && stats.usedTypes.numeric
  },
  {
    id: 'numeric_master',
    category: 'explorer',
    rarity: 'rare',
    title: '数据控',
    description: '数值型计划累计记录 30 次',
    icon: '📊',
    maxProgress: 30,
    points: 30,
    condition: (stats) => stats.numericCheckIns >= 30
  },
  {
    id: 'subtask_perfect',
    category: 'explorer',
    rarity: 'rare',
    title: '完美主义者',
    description: '子任务型计划累计 10 次全部完成',
    icon: '✨',
    maxProgress: 10,
    points: 30,
    condition: (stats) => stats.perfectSubtaskCount >= 10
  },

  // ========== 特殊时刻 ==========
  {
    id: 'early_bird',
    category: 'special',
    rarity: 'common',
    title: '早起鸟',
    description: '早上 7 点前完成打卡',
    icon: '🌅',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.earlyCheckIn
  },
  {
    id: 'night_owl',
    category: 'special',
    rarity: 'common',
    title: '夜猫子',
    description: '晚上 10 点后完成打卡',
    icon: '🌙',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.nightCheckIn
  },
  {
    id: 'weekend_warrior',
    category: 'special',
    rarity: 'rare',
    title: '周末不躺平',
    description: '连续 4 个周末都打卡',
    icon: '⛰️',
    maxProgress: 1,
    points: 30,
    condition: (stats) => stats.weekendWarrior
  },
  {
    id: 'comeback',
    category: 'special',
    rarity: 'rare',
    title: '王者归来',
    description: '断签后重新连续打卡 7 天',
    icon: '🔥',
    maxProgress: 1,
    points: 30,
    condition: (stats) => stats.comeback
  },
  {
    id: 'completer',
    category: 'special',
    rarity: 'common',
    title: '计划终结者',
    description: '完成一个计划（手动归档）',
    icon: '🎉',
    maxProgress: 1,
    points: 10,
    condition: (stats) => stats.completedHabits >= 1
  },
  {
    id: 'legendary_couple',
    category: 'special',
    rarity: 'legendary',
    title: '神仙眷侣',
    description: '解锁所有其他成就',
    icon: '👑',
    maxProgress: 1,
    points: 200,
    condition: (stats) => stats.unlockedCount >= 23
  }
];

function getAchievementConfig(id) {
  return ACHIEVEMENTS.find(a => a.id === id) || null;
}

function getAllAchievements() {
  return ACHIEVEMENTS;
}

module.exports = {
  ACHIEVEMENTS,
  getAchievementConfig,
  getAllAchievements
};
