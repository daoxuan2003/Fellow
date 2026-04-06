/**
 * 通知文案配置文件
 * 集中管理所有推送通知的标题和内容
 */

// 通知文案模板
const NOTIFICATION_TEMPLATES = {
  // 测试通知
  test: {
    title: '测试通知',
    body: '这是一条测试推送消息！'
  },
  
  // 解除绑定关系
  unbound: {
    title: '伴侣关系已解除',
    body: (data) => `${data.nickname} 解除了你们的情侣关系`
  },
  
  // 收到情侣邀请
  inviteReceived: {
    title: '收到情侣邀请',
    body: (data) => `${data.nickname} 想和你绑定情侣关系`
  },
  
  // 对方接受邀请
  inviteAccepted: {
    title: '对方接受了你的邀请',
    body: (data) => `${data.nickname} 绑定成功！快去打个招呼吧！`
  },
  
  // 对方拒绝邀请
  inviteRejected: {
    title: '对方拒绝了你的邀请',
    body: (data) => `${data.nickname} 拒绝了你的绑定邀请`
  },
  
  // 对方取消邀请
  inviteCancelled: {
    title: '对方取消了邀请',
    body: (data) => `${data.nickname} 取消了绑定邀请`
  },
  
  // ========== 代取快递通知 ==========
  
  // 新快递请求
  expressNew: {
    title: '宝宝，帮我取个快递~',
    body: (data) => {
      const { nickname, item, location } = data;
      const itemStr = item ? `是${item}，` : '';
      return `${nickname}添加了一个快递，${itemStr}在${location}~`;
    }
  },
  
  // 紧急快递请求
  expressNewUrgent: {
    title: '紧急快递！快帮忙取一下~',
    body: (data) => {
      const { nickname, item } = data;
      const itemStr = item ? `（${item}）` : '';
      return `这个快递${itemStr}非常重要！！快帮${nickname}取回来！`;
    }
  },
  
  // 已取件（取对方的快递）
  expressPicked: {
    title: '快递取到啦~',
    body: (data) => {
      const { nickname, item } = data;
      const itemStr = item ? `（${item}）` : '';
      return `${nickname}取了你的快递${itemStr}~`;
    }
  },
  
  // 已取件（取自己的快递）
  expressPickedSelf: {
    title: '我自己取啦~',
    body: (data) => {
      const { nickname, item } = data;
      const itemStr = item ? `（${item}）` : '';
      return `${nickname}取了自己的快递${itemStr}~`;
    }
  },
  
  // 撤销取件
  expressUnpicked: {
    title: '快递放回啦',
    body: (data) => {
      const { nickname, item } = data;
      const itemStr = item ? `（${item}）` : '';
      return `${nickname}撤销了取件，快递${itemStr}放回待取列表~`;
    }
  },
  
  // 删除快递
  expressDeleted: {
    title: '快递已删除',
    body: (data) => {
      const { item } = data;
      return item ? `一个快递（${item}）被删除了~` : '一个快递被删除了~';
    }
  },
  
  // ========== 坚持计划通知 ==========
  
  // 创建新计划
  habitCreated: {
    title: '✨ 新计划来了',
    body: (data) => {
      const { nickname, pronoun, habitTitle } = data;
      const name = nickname || pronoun || 'TA';
      return `${name}创建了「${habitTitle}」，一起加油！`;
    }
  },
  
  // 编辑计划
  habitEdited: {
    title: '📝 计划已更新',
    body: (data) => {
      const { nickname, pronoun, habitTitle } = data;
      const name = nickname || pronoun || 'TA';
      return `${name}修改了「${habitTitle}」的设置`;
    }
  },
  
  // 删除计划
  habitDeleted: {
    title: '🗑️ 计划已删除',
    body: (data) => {
      const { nickname, pronoun, habitTitle } = data;
      const name = nickname || pronoun || 'TA';
      return `${name}删除了「${habitTitle}」`;
    }
  },
  
  // 打卡完成（单人）
  habitCheckIn: {
    title: '💪 计划打卡',
    body: (data) => {
      const { nickname, pronoun, habitTitle } = data;
      const name = nickname || pronoun || 'TA';
      return `「${habitTitle}」${name}已完成，该你啦！`;
    }
  },
  
  // 双方完成（双人计划）
  habitBothComplete: {
    title: '🎉 计划全部完成！',
    body: (data) => {
      const { habitTitle } = data;
      return `「${habitTitle}」你们一起完成了！太棒了！`;
    }
  },
  
  // 计划归档
  habitCompleted: {
    title: '✅ 计划已归档',
    body: (data) => {
      const { nickname, pronoun, habitTitle, participation } = data;
      const name = nickname || pronoun || 'TA';
      if (participation === 'both') {
        return `「${habitTitle}」你们一起坚持完成了！恭喜！`;
      }
      return `「${habitTitle}」${name}已完成！恭喜！`;
    }
  },
  
  // 连续打卡里程碑
  habitStreakMilestone: {
    title: '🔥 连续打卡里程碑',
    body: (data) => {
      const { streak, habitTitle } = data;
      const emoji = streak >= 30 ? '👑' : streak >= 7 ? '⚡' : '🔥';
      return `${emoji} 「${habitTitle}」已连续打卡${streak}天！继续保持！`;
    }
  },
  
  // 每日打卡提醒
  habitDailyReminder: {
    title: '⏰ 今日打卡提醒',
    body: (data) => {
      const { count } = data;
      return count === 1 ? '今天还有1个计划未完成哦~' : `今天还有${count}个计划未完成哦~`;
    }
  },
  
  // 补卡提醒
  habitMakeUpReminder: {
    title: '📅 本周补卡提醒',
    body: (data) => {
      const { count } = data;
      return `本周还有${count}天可以补打卡，不要错过哦~`;
    }
  },
  
  // 周末总结
  habitWeekendSummary: {
    title: '📊 本周打卡总结',
    body: (data) => {
      const { myCompleted, total, partnerCompleted } = data;
      if (partnerCompleted !== undefined) {
        const diff = myCompleted - partnerCompleted;
        if (diff > 0) return `本周你完成${myCompleted}天，比TA多${diff}天，太棒了！`;
        if (diff < 0) return `本周你完成${myCompleted}天，比TA少${Math.abs(diff)}天，加油！`;
        return `本周你们都完成了${myCompleted}天，默契满分！`;
      }
      return `本周完成度${Math.round((myCompleted / total) * 100)}%，下周继续加油！`;
    }
  },
  
  // 对方连续打卡提醒（激励）
  habitPartnerStreak: {
    title: '👀 对方连续打卡中',
    body: (data) => {
      const { nickname, pronoun, streak, habitTitle } = data;
      const name = nickname || pronoun || 'TA';
      return `${name}在「${habitTitle}」已连续打卡${streak}天，你也要加油！`;
    }
  },
  
  // 计划停滞提醒
  habitInactive: {
    title: '⚠️ 计划停滞提醒',
    body: (data) => {
      const { days, habitTitle } = data;
      return `「${habitTitle}」${days}天没打卡了，要坚持哦！`;
    }
  },
  
  // ========== 心愿墙通知 ==========
  
  // 新增心愿
  wishCreated: {
    title: '💝 新增小心愿',
    body: (data) => {
      const { nickname, wishTitle } = data;
      return `${nickname}添加了一个心愿：${wishTitle}`;
    }
  },
  
  // 心愿完成
  wishCompleted: {
    title: '✨ 心愿达成！',
    body: (data) => {
      const { nickname, wishTitle, completionNote } = data;
      const noteStr = completionNote ? ` (${completionNote})` : '';
      return `${nickname}帮你实现了「${wishTitle}」${noteStr} 🎉`;
    }
  },
  
  // 心愿删除
  wishDeleted: {
    title: '🗑️ 心愿已删除',
    body: (data) => {
      const { nickname, wishTitle } = data;
      return `${nickname}删除了心愿「${wishTitle}」`;
    }
  }
}

/**
 * 获取通知内容
 * @param {string} type - 通知类型
 * @param {object} data - 模板数据（如 nickname）
 * @returns {object} { title, body }
 */
function getNotification(type, data = {}) {
  const template = NOTIFICATION_TEMPLATES[type]
  if (!template) {
    console.warn(`[Notifications] 未知通知类型: ${type}`)
    return { title: '新消息', body: '' }
  }
  
  return {
    title: template.title,
    body: typeof template.body === 'function' ? template.body(data) : template.body
  }
}

/**
 * 获取完整推送 payload（包含 data 字段）
 * @param {string} type - 通知类型
 * @param {object} data - 模板数据
 * @param {object} extraData - 额外的 data 字段（如 fromId, partnerId 等）
 * @returns {object} { title, body, icon, data }
 */
function getPushPayload(type, data = {}, extraData = {}) {
  const notification = getNotification(type, data)
  
  return {
    ...notification,
    icon: '/heart.svg',
    data: {
      type,
      ...extraData
    }
  }
}

module.exports = {
  getNotification,
  getPushPayload,
  NOTIFICATION_TEMPLATES
}
