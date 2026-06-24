// ============================================
// 计划数据收集器
// ============================================

const Habit = require('../../models/Habit');
const CheckIn = require('../../models/CheckIn');
const User = require('../../models/User');
const { formatDate } = require('../../utils/helpers');

class DataCollector {
  /**
   * 收集单个计划的完整数据
   * @param {String} habitId - 计划 ID
   * @param {String} userId - 用户 ID
   */
  async collectHabitData(habitId, userId) {
    try {
      // 获取计划信息
      const habit = await Habit.findById(habitId).lean();
      if (!habit) return null;

      // 获取用户和伴侣信息
      const user = await User.findById(userId).lean();
      const partner = user?.partnerId ? await User.findById(user.partnerId).lean() : null;

      // 获取所有打卡记录（最近 30 天）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);

      const checkIns = await CheckIn.find({
        habitId,
        date: { $gte: thirtyDaysAgoStr }
      }).sort({ date: -1 }).lean();

      const userCheckIns = checkIns.filter(ci => ci.userId === userId);
      const partnerCheckIns = partner ? checkIns.filter(ci => ci.userId === partner._id.toString()) : [];

      // 计算天数
      const startDate = new Date(habit.createdAt);
      const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

      // 统计数据
      const userStats = this.calculateStats(userCheckIns, habit, daysSinceStart);
      const partnerStats = partner ? this.calculateStats(partnerCheckIns, habit, daysSinceStart, true) : null;

      if (partnerStats) {
        partnerStats.syncRate = this.calculateSyncRate(userCheckIns, partnerCheckIns);
      }

      return {
        habit: {
          id: habit._id.toString(),
          title: habit.title,
          description: habit.description,
          type: habit.type,
          frequency: habit.frequency,
          weekdays: habit.weekdays,
          subTasks: habit.subTasks?.map(st => ({
            id: st.id || st._id?.toString(),
            title: st.title,
            weekday: st.weekday
          })),
          numericConfig: habit.numericConfig,
          participation: habit.participation,
          createdAt: habit.createdAt
        },
        user: {
          id: userId,
          nickname: user?.nickname || '我',
          gender: user?.gender
        },
        partner: partner ? {
          id: partner._id.toString(),
          nickname: partner.nickname || 'TA',
          gender: partner.gender
        } : null,
        checkIns: userCheckIns.map(ci => ({
          date: ci.date,
          completedSubTasks: ci.completedSubTasks || [],
          numericValue: ci.numericValue,
          mood: ci.mood,
          note: ci.note,
          isPerfect: ci.isPerfect,
          createdAt: ci.createdAt
        })),
        userStats,
        partnerStats,
        daysSinceStart
      };
    } catch (error) {
      console.error('收集计划数据失败:', error);
      return null;
    }
  }

  /**
   * 计算统计数据
   */
  calculateStats(checkIns, habit, daysSinceStart, isPartner = false) {
    const totalCheckIns = checkIns.length;
    
    // 计算应该打卡的总天数
    let expectedDays = 0;
    if (habit.frequency === 'daily') {
      expectedDays = Math.min(daysSinceStart, 30);
    } else if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
      // 计算这 30 天内应该打卡的周几有多少个
      for (let i = 0; i < Math.min(daysSinceStart, 30); i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (habit.weekdays.includes(d.getDay())) {
          expectedDays++;
        }
      }
    }
    
    const completionRate = expectedDays > 0 
      ? Math.round((totalCheckIns / expectedDays) * 100) 
      : 0;

    // 计算连续天数
    const { currentStreak, maxStreak } = this.calculateStreak(checkIns, habit);

    // 最近 7 天完成率
    const last7Days = checkIns.filter(ci => {
      const date = new Date(ci.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return date >= sevenDaysAgo;
    }).length;
    const last7DaysRate = Math.round((last7Days / 7) * 100);

    return {
      totalCheckIns,
      expectedDays,
      completionRate,
      currentStreak,
      maxStreak,
      last7DaysRate,
      perfectCheckIns: checkIns.filter(ci => ci.isPerfect).length
    };
  }

  /**
   * 计算连续打卡天数
   */
  calculateStreak(checkIns, habit) {
    if (checkIns.length === 0) return { currentStreak: 0, maxStreak: 0 };

    const dates = [...new Set(checkIns.map(ci => ci.date))].sort((a, b) => b.localeCompare(a));
    const weekdays = habit?.weekdays || [];
    const frequency = habit?.frequency || 'daily';

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 生成应该打卡的日期列表（倒序）
    const requiredDates = [];
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dayOfWeek = checkDate.getDay();
      const dateStr = formatDate(checkDate);
      
      if (frequency === 'weekly' && weekdays.length > 0) {
        if (weekdays.includes(dayOfWeek)) {
          requiredDates.push(dateStr);
        }
      } else {
        requiredDates.push(dateStr);
      }
    }

    // 计算当前连续
    for (const dateStr of requiredDates) {
      if (dates.includes(dateStr)) {
        currentStreak++;
      } else if (currentStreak > 0) {
        break;
      }
    }

    // 计算最长连续
    let prevIndex = -1;
    for (const dateStr of dates) {
      const idx = requiredDates.indexOf(dateStr);
      if (idx !== -1) {
        if (prevIndex === -1 || idx === prevIndex + 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
        prevIndex = idx;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

    return { currentStreak, maxStreak };
  }

  /**
   * 计算双方同步率
   */
  calculateSyncRate(userCheckIns, partnerCheckIns) {
    const userDates = new Set(userCheckIns.map(ci => ci.date));
    const partnerDates = new Set(partnerCheckIns.map(ci => ci.date));
    
    const allDates = new Set([...userDates, ...partnerDates]);
    if (allDates.size === 0) return 0;
    
    let syncCount = 0;
    for (const date of allDates) {
      if (userDates.has(date) && partnerDates.has(date)) {
        syncCount++;
      }
    }
    
    return Math.round((syncCount / allDates.size) * 100);
  }
}

module.exports = new DataCollector();
