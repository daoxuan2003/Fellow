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
  
  // 已取件
  expressPicked: {
    title: '快递取到啦~',
    body: (data) => {
      const { nickname, item } = data;
      const itemStr = item ? `（${item}）` : '';
      return `${nickname}取了你的快递${itemStr}~`;
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
