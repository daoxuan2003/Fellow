// ============================================
// AI 数据收集器
// 收集所有与 AI 分析相关的用户行为数据
// ============================================

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const User = require('../../models/User');
const Habit = require('../../models/Habit');
const CheckIn = require('../../models/CheckIn');
const { storageService } = require('../../services/storage');

class AIDataCollector {
  constructor() {
    this.dataDir = path.join(__dirname, '../../temp/ai-data');
    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (e) {
      console.error('创建 AI 数据目录失败:', e);
    }
  }

  // 生成用户哈希 ID（脱敏）
  hashUserId(userId) {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  // 收集单个用户的完整画像
  async collectUserProfile(userId) {
    const user = await User.findById(userId).lean();
    if (!user) return null;

    const hashedId = this.hashUserId(userId);
    
    // 获取所有计划
    const habits = await Habit.find({ 
      $or: [
        { createdBy: userId },
        { coupleId: { $regex: userId } }
      ]
    }).lean();

    // 获取所有打卡记录
    const checkIns = await CheckIn.find({ userId }).lean();

    // 计算行为特征
    const checkInTimes = checkIns.map(ci => {
      const date = new Date(ci.createdAt || ci.date);
      return date.getHours() + date.getMinutes() / 60;
    }).sort((a, b) => a - b);

    const medianTime = checkInTimes.length > 0 
      ? checkInTimes[Math.floor(checkInTimes.length / 2)] 
      : 20;

    // 计算计划完成情况
    const completedHabits = habits.filter(h => h.status === 'completed').length;
    const activeHabits = habits.filter(h => h.status === 'active').length;
    const droppedHabits = habits.filter(h => {
      if (h.status !== 'active') return false;
      const lastActivity = new Date(h.updatedAt);
      const daysSinceUpdate = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 14; // 14 天无活动视为放弃
    }).length;

    // 计算连续打卡统计
    const streaks = this.calculateStreaks(checkIns);

    return {
      type: 'user_profile',
      userId: hashedId,
      timestamp: new Date().toISOString(),
      data: {
        basicInfo: {
          joinDate: user.createdAt,
          gender: user.gender,
          hasPartner: !!user.partnerId
        },
        planStats: {
          totalCreated: habits.length,
          completed: completedHabits,
          active: activeHabits,
          dropped: droppedHabits,
          completionRate: habits.length > 0 ? completedHabits / habits.length : 0
        },
        checkInStats: {
          totalCount: checkIns.length,
          perfectCount: checkIns.filter(ci => ci.isPerfect).length,
          makeupCount: checkIns.filter(ci => {
            const ciDate = new Date(ci.date);
            const today = new Date();
            return ciDate.toDateString() !== today.toDateString();
          }).length
        },
        behavioralTraits: {
          preferredCheckInTime: `${Math.floor(medianTime)}:${String(Math.floor((medianTime % 1) * 60)).padStart(2, '0')}`,
          avgStreak: streaks.avg,
          maxStreak: streaks.max,
          resilienceScore: this.calculateResilience(checkIns), // 失败后恢复速度
          consistencyScore: this.calculateConsistency(checkIns) // 整体一致性
        }
      }
    };
  }

  // 收集单个计划的详细分析数据
  async collectHabitAnalytics(habitId, userId) {
    const habit = await Habit.findById(habitId).lean();
    if (!habit) return null;

    const checkIns = await CheckIn.find({ 
      habitId,
      userId 
    }).sort({ date: 1 }).lean();

    const hashedUserId = this.hashUserId(userId);
    const hashedPlanId = this.hashUserId(habitId);

    // 分析完成时间分布
    const completionTimes = checkIns.map(ci => {
      const date = new Date(ci.createdAt || ci.date);
      return {
        hour: date.getHours(),
        weekday: date.getDay(),
        delay: ci.scheduledTime ? this.parseTimeDiff(ci.scheduledTime, date) : 0
      };
    });

    // 分析失败模式
    const expectedDates = this.generateExpectedDates(habit);
    const actualDates = new Set(checkIns.map(ci => ci.date));
    const missedDates = expectedDates.filter(d => !actualDates.has(d));

    const failurePatterns = this.analyzeFailurePatterns(missedDates, completionTimes);

    return {
      type: 'habit_analytics',
      userId: hashedUserId,
      planId: hashedPlanId,
      timestamp: new Date().toISOString(),
      data: {
        planProfile: {
          title: habit.title,
          type: habit.type,
          frequency: habit.frequency,
          hasSubtasks: !!(habit.subTasks && habit.subTasks.length > 0),
          hasNumericTarget: !!(habit.numericConfig && habit.numericConfig.targetValue)
        },
        performance: {
          completionRate: expectedDates.length > 0 ? checkIns.length / expectedDates.length : 0,
          perfectRate: checkIns.length > 0 ? checkIns.filter(ci => ci.isPerfect).length / checkIns.length : 0,
          avgCompletionTime: this.calculateAvgTime(completionTimes.map(c => c.hour)),
          currentStreak: this.calculateCurrentStreak(checkIns, habit),
          maxStreak: this.calculateMaxStreak(checkIns, habit)
        },
        patterns: {
          preferredWeekdays: this.getPreferredWeekdays(completionTimes),
          failurePatterns: failurePatterns,
          successFactors: this.analyzeSuccessFactors(checkIns, completionTimes)
        }
      }
    };
  }

  // 收集单次打卡详情
  async collectCheckInDetail(checkInId) {
    const checkIn = await CheckIn.findById(checkInId).lean();
    if (!checkIn) return null;

    const habit = await Habit.findById(checkIn.habitId).lean();

    return {
      type: 'check_in_detail',
      checkInId: this.hashUserId(checkInId),
      userId: this.hashUserId(checkIn.userId),
      planId: this.hashUserId(checkIn.habitId),
      timestamp: new Date().toISOString(),
      data: {
        date: checkIn.date,
        context: {
          dayOfWeek: new Date(checkIn.date).getDay(),
          isWeekend: [0, 6].includes(new Date(checkIn.date).getDay()),
          hourOfDay: new Date(checkIn.createdAt || checkIn.date).getHours()
        },
        performance: {
          completedSubTasks: (checkIn.completedSubTasks || []).length,
          totalSubTasks: habit?.subTasks?.length || 0,
          isPerfect: checkIn.isPerfect,
          isMakeUp: this.isMakeUpCheckIn(checkIn),
          mood: checkIn.mood,
          hasNote: !!(checkIn.note && checkIn.note.length > 0)
        },
        numericData: checkIn.numericValue !== undefined ? {
          value: checkIn.numericValue,
          unit: habit?.numericConfig?.unit,
          target: habit?.numericConfig?.targetValue
        } : null
      }
    };
  }

  // 计算连续打卡数据
  calculateStreaks(checkIns) {
    if (checkIns.length === 0) return { avg: 0, max: 0 };

    const dates = [...new Set(checkIns.map(ci => ci.date))].sort();
    let currentStreak = 1;
    let maxStreak = 1;
    let streaks = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        streaks.push(currentStreak);
        currentStreak = 1;
      }
    }
    streaks.push(currentStreak);

    const avgStreak = streaks.reduce((a, b) => a + b, 0) / streaks.length;

    return { avg: Math.round(avgStreak), max: maxStreak };
  }

  // 计算抗挫折能力（失败后多久恢复）
  calculateResilience(checkIns) {
    if (checkIns.length < 5) return 0.5;

    const dates = [...new Set(checkIns.map(ci => ci.date))].sort();
    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 1) {
        gaps.push(diffDays - 1);
      }
    }

    if (gaps.length === 0) return 1.0;

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    // 平均间隔越短，抗挫折能力越强
    return Math.max(0, Math.min(1, 1 - (avgGap - 1) / 7));
  }

  // 计算一致性（打卡时间的稳定程度）
  calculateConsistency(checkIns) {
    if (checkIns.length < 3) return 0.5;

    const times = checkIns.map(ci => {
      const date = new Date(ci.createdAt || ci.date);
      return date.getHours() * 60 + date.getMinutes();
    });

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，一致性越高（30 分钟内为高度一致）
    return Math.max(0, Math.min(1, 1 - stdDev / 120));
  }

  // 生成计划预期打卡日期
  generateExpectedDates(habit) {
    const dates = [];
    const startDate = new Date(habit.createdAt);
    const endDate = new Date();
    
    if (habit.frequency === 'daily') {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (habit.frequency === 'weekly' && habit.weekdays) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (habit.weekdays.includes(d.getDay())) {
          dates.push(d.toISOString().split('T')[0]);
        }
      }
    }
    
    return dates;
  }

  // 分析失败模式
  analyzeFailurePatterns(missedDates, completionTimes) {
    const patterns = [];
    
    // 检查是否常在某天失败
    const missedWeekdays = missedDates.map(d => new Date(d).getDay());
    const weekdayCounts = {};
    missedWeekdays.forEach(w => {
      weekdayCounts[w] = (weekdayCounts[w] || 0) + 1;
    });
    
    const maxMissedWeekday = Object.entries(weekdayCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (maxMissedWeekday && maxMissedWeekday[1] >= 2) {
      const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      patterns.push(`常在${weekdayNames[maxMissedWeekday[0]]}中断`);
    }

    // 检查是否常在某个时间后失败
    const lateCompletions = completionTimes.filter(c => c.hour >= 23).length;
    if (lateCompletions > completionTimes.length * 0.3) {
      patterns.push('常在深夜打卡，容易因疲劳中断');
    }

    return patterns;
  }

  // 分析成功因素
  analyzeSuccessFactors(checkIns, completionTimes) {
    const factors = [];
    
    // 检查早上是否更容易成功
    const morningCount = completionTimes.filter(c => c.hour >= 6 && c.hour <= 9).length;
    if (morningCount > completionTimes.length * 0.4) {
      factors.push('早上执行力强');
    }

    // 检查是否有笔记的习惯
    const withNoteRate = checkIns.filter(ci => ci.note && ci.note.length > 10).length / checkIns.length;
    if (withNoteRate > 0.5) {
      factors.push('记录详细，态度认真');
    }

    return factors;
  }

  // 辅助方法
  parseTimeDiff(scheduled, actual) {
    // 简化处理，实际应该解析时间字符串
    return 0;
  }

  calculateAvgTime(hours) {
    if (hours.length === 0) return null;
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    return `${Math.floor(avg)}:${String(Math.floor((avg % 1) * 60)).padStart(2, '0')}`;
  }

  calculateCurrentStreak(checkIns, habit) {
    // 简化实现
    return 0;
  }

  calculateMaxStreak(checkIns, habit) {
    // 简化实现
    return 0;
  }

  getPreferredWeekdays(completionTimes) {
    const counts = {};
    completionTimes.forEach(c => {
      counts[c.weekday] = (counts[c.weekday] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => parseInt(day));
  }

  isMakeUpCheckIn(checkIn) {
    const checkDate = new Date(checkIn.date);
    const today = new Date();
    return checkDate.toDateString() !== today.toDateString();
  }

  // 导出用户数据到 JSONL 文件
  async exportUserData(userId, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    const hashedId = this.hashUserId(userId);
    
    // 收集所有数据
    const records = [];
    
    // 1. 用户画像
    const profile = await this.collectUserProfile(userId);
    if (profile) records.push(profile);
    
    // 2. 计划分析
    const habits = await Habit.find({
      $or: [
        { createdBy: userId },
        { coupleId: { $regex: userId } }
      ]
    }).lean();
    
    for (const habit of habits) {
      const analytics = await this.collectHabitAnalytics(habit._id, userId);
      if (analytics) records.push(analytics);
    }
    
    // 3. 今日打卡详情
    const todayCheckIns = await CheckIn.find({
      userId,
      date: dateStr
    }).lean();
    
    for (const ci of todayCheckIns) {
      const detail = await this.collectCheckInDetail(ci._id);
      if (detail) records.push(detail);
    }
    
    // 转换为 JSONL 格式
    const jsonlContent = records.map(r => JSON.stringify(r)).join('\n');
    
    // 本地临时文件
    const localPath = path.join(this.dataDir, `${hashedId}_${dateStr}.jsonl`);
    await fs.writeFile(localPath, jsonlContent, 'utf8');
    
    // 上传到 S3（如果配置了）
    if (process.env.STORAGE_MODE === 's3') {
      const s3Key = `ai-training-data/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${hashedId}.jsonl`;
      try {
        await storageService.uploadBuffer(
          Buffer.from(jsonlContent, 'utf8'),
          s3Key,
          'application/jsonl'
        );
        console.log(`AI 数据已上传到 S3: ${s3Key}`);
      } catch (e) {
        console.error('上传到 S3 失败:', e);
      }
    }
    
    return localPath;
  }
}

module.exports = new AIDataCollector();
