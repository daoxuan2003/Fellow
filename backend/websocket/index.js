// ============================================
// WebSocket 服务
// ============================================

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../config/auth');

// 存储所有连接的客户端
const clients = new Map();

// WebSocket 服务器实例
let wss = null;

/**
 * 初始化 WebSocket 服务器
 * @param {number} port - WebSocket 服务器端口
 */
function initWebSocketServer(port = 3001) {
  wss = new WebSocket.Server({ port });
  
  console.log('WebSocket 服务器将在端口 ' + port + ' 启动');
  
  wss.on('connection', (ws, req) => {
    console.log('新的 WebSocket 连接');
    
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
          console.log('WebSocket JWT 验证失败:', jwtError.message);
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
        ws.userId = userId;
        ws.partnerId = user.partnerId || null;
        clients.set(userId, ws);
        
        console.log(`用户 ${userId} 已连接 WebSocket`);
        
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
            console.log('WebSocket 消息解析失败:', e);
          }
        });
        
        // 监听断开连接
        ws.on('close', () => {
          console.log(`用户 ${ws.userId} 断开 WebSocket 连接`);
          clients.delete(ws.userId);
        });
        
        // 监听错误
        ws.on('error', (error) => {
          console.log('WebSocket 错误:', error);
        });
        
      } catch (e) {
        console.log('WebSocket 首次消息解析失败:', e);
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
      console.log('未知的 WebSocket 消息类型:', data.type);
  }
}

/**
 * 通知伴侣
 * @param {string} partnerId - 伴侣ID
 * @param {object} message - 消息内容
 */
function notifyPartner(partnerId, message) {
  const partnerIdStr = partnerId.toString();
  const partnerWs = clients.get(partnerIdStr);
  if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
    partnerWs.send(JSON.stringify(message));
    console.log(`已通知伴侣 ${partnerId}`);
  } else {
    console.log(`伴侣 ${partnerId} 不在线`);
  }
}

/**
 * 广播消息给整个情侣（两人的所有设备）
 * @param {string} coupleId - 情侣ID
 * @param {object} message - 消息内容
 */
function broadcastToCouple(coupleId, message) {
  if (!coupleId) return;
  
  const coupleIdStr = coupleId.toString();
  let sentCount = 0;
  
  // 遍历所有客户端，找到属于这对情侣的连接
  clients.forEach((client, userId) => {
    if (client.readyState === WebSocket.OPEN) {
      // 检查该用户是否属于这对情侣
      // coupleId 格式是 userId1_userId2 排序后的
      const userIdStr = userId.toString();
      if (coupleIdStr.includes(userIdStr)) {
        client.send(JSON.stringify(message));
        sentCount++;
      }
    }
  });
  
  console.log(`[WS] 广播给情侣 ${coupleId}: ${sentCount} 个设备`);
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
  handleWebSocketMessage
};
