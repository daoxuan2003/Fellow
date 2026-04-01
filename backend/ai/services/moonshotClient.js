// ============================================
// Moonshot AI (Kimi) 客户端
// 文档：https://platform.moonshot.cn/docs/api/chat
// ============================================

const axios = require('axios');

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 模型列表
const MODELS = {
  K2_5: 'kimi-k2.5',           // 最新多模态模型（推荐）
  K2_TURBO: 'kimi-k2-turbo-preview',
  K2_THINKING: 'kimi-k2-thinking'
};

class MoonshotClient {
  constructor() {
    if (!MOONSHOT_API_KEY) {
      console.warn('⚠️ MOONSHOT_API_KEY 未设置，AI 功能将不可用');
    }
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息列表 [{role, content}]
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} AI 响应
   */
  async chat(messages, options = {}) {
    if (!MOONSHOT_API_KEY) {
      throw new Error('Moonshot API Key 未配置');
    }

    // 默认使用 k2.5 模型
    const model = options.model || MODELS.K2_5;
    
    // 构建请求体
    // 注意：kimi-k2.5 等新模型可能限制 temperature 只能为 1
    const body = {
      model,
      messages,
      max_tokens: options.maxTokens || 2000
    };
    
    // 只有非限制模型才传入 temperature
    if (options.temperature !== undefined && model !== MODELS.K2_5) {
      body.temperature = options.temperature;
    }

    // 注意：Moonshot 的 json_object 需要模型支持
    // 如果要求 JSON 输出，在 prompt 中说明比用 response_format 更可靠
    if (options.jsonMode) {
      // 确保最后一条消息要求 JSON 输出
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        // 已经在 prompt 中要求了 JSON，这里不需要额外设置
        // response_format 在 kimi-k2.5 上支持
        body.response_format = { type: 'json_object' };
      }
    }

    try {
      const response = await axios.post(MOONSHOT_API_URL, body, {
        headers: {
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 延长至 60 秒，复杂分析需要时间
      });

      // 检查响应结构
      if (!response.data.choices || !response.data.choices[0]) {
        return {
          success: false,
          error: 'AI 返回格式异常'
        };
      }

      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      };
    } catch (error) {
      console.error('Moonshot API 错误:', error.response?.data || error.message);
      
      // 详细的错误信息
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message 
        || 'AI 服务暂时不可用';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 流式聊天（用于打字机效果）
   * @param {Array} messages - 消息列表
   * @param {Function} onChunk - 接收到数据块的回调 (chunk, isDone, error)
   */
  async chatStream(messages, onChunk, options = {}) {
    if (!MOONSHOT_API_KEY) {
      onChunk(null, false, 'Moonshot API Key 未配置');
      return;
    }

    const model = options.model || MODELS.K2_5;

    try {
      const response = await axios.post(
        MOONSHOT_API_URL,
        {
          model,
          messages,
          max_tokens: options.maxTokens || 2000,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 120000 // 流式请求可能需要更长时间
        }
      );

      let buffer = '';

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // 处理 SSE 格式的数据
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行到下一次

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const data = trimmedLine.slice(6); // 去掉 'data: '
          
          if (data === '[DONE]') {
            onChunk(null, true, null);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            
            // 检查是否有错误
            if (parsed.error) {
              onChunk(null, false, parsed.error.message || '流式响应错误');
              return;
            }

            // 提取内容
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (delta.content) {
                onChunk(delta.content, false, null);
              }
              // 处理 reasoning_content（思考模型）
              if (delta.reasoning_content) {
                onChunk(delta.reasoning_content, false, null, true); // 最后一个参数表示是推理内容
              }
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
          }
        }
      });

      response.data.on('end', () => {
        // 流结束
        onChunk(null, true, null);
      });

      response.data.on('error', (error) => {
        console.error('SSE 错误:', error.message);
        onChunk(null, false, error.message || '网络连接错误');
      });

    } catch (error) {
      console.error('Moonshot 流式 API 错误:', error.message);
      onChunk(null, false, error.response?.data?.error?.message || error.message || '请求失败');
    }
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels() {
    return [
      { id: MODELS.K2_5, name: 'Kimi K2.5', description: '最智能的多模态模型，推荐' },
      { id: MODELS.K2_TURBO, name: 'Kimi K2 Turbo', description: '更快响应' },
      { id: MODELS.K2_THINKING, name: 'Kimi K2 Thinking', description: '深度思考模式' }
    ];
  }
}

module.exports = new MoonshotClient();
