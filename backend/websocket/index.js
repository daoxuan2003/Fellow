// ============================================
// WebSocket 服务
// ============================================

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../config/auth');
const { logDebug, logError, logInfo } = require('../utils/safeLogger');

// 存储所有连接的客户端：userId -> Set<WebSocket>
const clients = new Map();

// WebSocket 服务器实例
let wss = null;

function toId(value) {
  return value ? value.toString() : null;
}

function getCoupleId(userId, partnerId) {
  const userIdStr = toId(userId);
  const partnerIdStr = toId(partnerId);
  if (!userIdStr || !partnerIdStr) return null;
  return [userIdStr, partnerIdStr].sort().join('_');
}

function getCoupleMemberIds(coupleId) {
  const coupleIdStr = toId(coupleId);
  if (!coupleIdStr) return new Set();

  const memberIds = coupleIdStr.split('_');
  if (memberIds.length !== 2 || memberIds.some((id) => !id)) {
    return new Set();
  }

  return new Set(memberIds);
}

function registerClient(userId, ws, partnerId) {
  const userIdStr = toId(userId);
  if (!userIdStr || !ws) return;

  ws.userId = userIdStr;
  ws.partnerId = toId(partnerId);
  ws.coupleId = getCoupleId(userIdStr, ws.partnerId);

  if (!clients.has(userIdStr)) {
    clients.set(userIdStr, new Set());
  }
  clients.get(userIdStr).add(ws);
}

function unregisterClient(ws) {
  const userIdStr = toId(ws && ws.userId);
  if (!userIdStr) return;

  const userClients = clients.get(userIdStr);
  if (!userClients) return;

  userClients.delete(ws);
  if (userClients.size === 0) {
    clients.delete(userIdStr);
  }
}

function sendToClient(client, message) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }

  unregisterClient(client);
  return false;
}

/**
 * 初始化 WebSocket 服务器
 * @param {number} port - WebSocket 服务器端口
 */
function initWebSocketServer(port = 3001) {
  wss = new WebSocket.Server({ port });
  
  logInfo('[WS] WebSocket 服务器已启动', { port });
  
  wss.on('connection', (ws, req) => {
    logDebug('[WS] 新连接进入');
    
    // 等待客户端发送 token 进行身份验证
    ws.once('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // 验证消息类型
        if (data.type !== 'auth' || !data.token) {
          ws.close(1008, '身份验证失败');
          return;
        }
        
        // 验证 JWT token
        let decoded;
        try {
          decoded = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
        } catch (jwtError) {
          logDebug('[WS] JWT 验证失败:', jwtError.message);
          ws.close(1008, '身份验证失败');
          return;
        }
        
        const userId = decoded.userId;
        
        // 获取用户信息
        const user = await User.findById(userId);
        if (!user) {
          ws.close(1008, '用户不存在');
          return;
        }
        
        // 保存用户连接
        registerClient(userId, ws, user.partnerId);
        
        logDebug('[WS] 用户已连接', { userId });
        
        // 发送连接成功消息
        ws.send(JSON.stringify({
          type: 'connected',
          message: '连接成功'
        }));
        
        // 监听消息
        ws.on('message', (msg) => {
          try {
            const msgData = JSON.parse(msg);
            handleWebSocketMessage(ws, msgData);
          } catch (e) {
            logDebug('[WS] 消息解析失败:', e);
          }
        });
        
        // 监听断开连接
        ws.on('close', () => {
          logDebug('[WS] 用户断开连接', { userId: ws.userId });
          unregisterClient(ws);
        });
        
        // 监听错误
        ws.on('error', (error) => {
          logError('[WS] 连接错误:', error);
        });
        
      } catch (e) {
        logDebug('[WS] 首次消息解析失败:', e);
        ws.close(1008, '无效的消息格式');
      }
    });
    
    // 5秒后如果没有收到身份验证，关闭连接
    setTimeout(() => {
      if (!ws.userId) {
        ws.close(1008, '身份验证超时');
      }
    }, 5000);
  });
  
  return wss;
}

/**
 * 处理 WebSocket 消息
 * @param {WebSocket} ws - WebSocket 连接
 * @param {object} data - 消息数据
 */
function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      // 心跳检测
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'update':
      // 用户更新了资料，通知伴侣
      if (ws.partnerId) {
        notifyPartner(ws.partnerId, {
          type: 'partnerUpdated',
          data: data.data
        });
      }
      break;
      
    default:
      logDebug('[WS] 未知消息类型:', data.type);
  }
}

/**
 * 通知伴侣
 * @param {string} partnerId - 伴侣ID
 * @param {object} message - 消息内容
 */
function notifyPartner(partnerId, message) {
  if (!partnerId) return 0;

  const partnerIdStr = partnerId.toString();
  const partnerClients = clients.get(partnerIdStr);
  if (!partnerClients || partnerClients.size === 0) {
    logDebug('[WS] 伴侣不在线', { partnerId });
    return 0;
  }

  let sentCount = 0;
  [...partnerClients].forEach((client) => {
    if (sendToClient(client, message)) {
      sentCount++;
    }
  });

  if (sentCount > 0) {
    logDebug('[WS] 已通知伴侣设备', { partnerId, sentCount });
  } else {
    logDebug('[WS] 伴侣不在线', { partnerId });
  }

  return sentCount;
}

/**
 * 广播消息给整个情侣（两人的所有设备）
 * @param {string} coupleId - 情侣ID
 * @param {object} message - 消息内容
 */
function broadcastToCouple(coupleId, message) {
  if (!coupleId) return 0;
  
  const coupleIdStr = coupleId.toString();
  const coupleMemberIds = getCoupleMemberIds(coupleIdStr);
  let sentCount = 0;
  
  // 遍历所有客户端，找到属于这对情侣的连接
  clients.forEach((userClients, userId) => {
    if (!coupleMemberIds.has(userId.toString())) return;

    [...userClients].forEach((client) => {
      if (sendToClient(client, message)) {
        sentCount++;
      }
    });
  });
  
  logDebug('[WS] 已广播情侣设备', { coupleId, sentCount });
  return sentCount;
}

/**
 * 广播消息给所有连接的客户端
 * @param {object} message - 消息内容
 */
function broadcast(message) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

/**
 * 获取 WebSocket 服务器实例
 */
function getWSS() {
  return wss;
}

/**
 * 获取客户端连接Map
 */
function getClients() {
  return clients;
}

module.exports = {
  initWebSocketServer,
  notifyPartner,
  broadcastToCouple,
  broadcast,
  getWSS,
  getClients,
  registerClient,
  unregisterClient,
  handleWebSocketMessage
};
