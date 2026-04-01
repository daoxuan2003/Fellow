// ============================================
// Moonshot AI (Kimi) 客户端
// ============================================

const axios = require('axios');

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

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

    try {
      const response = await axios.post(
        MOONSHOT_API_URL,
        {
          model: options.model || 'kimi-latest',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2000,
          response_format: options.jsonMode ? { type: 'json_object' } : undefined
        },
        {
          headers: {
            'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('Moonshot API 错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'AI 服务暂时不可用'
      };
    }
  }

  /**
   * 流式聊天（用于打字机效果）
   * @param {Array} messages - 消息列表
   * @param {Function} onChunk - 接收到数据块的回调
   */
  async chatStream(messages, onChunk, options = {}) {
    if (!MOONSHOT_API_KEY) {
      throw new Error('Moonshot API Key 未配置');
    }

    try {
      const response = await axios.post(
        MOONSHOT_API_URL,
        {
          model: options.model || 'kimi-latest',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2000,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 60000
        }
      );

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk(null, true); // 结束标记
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content, false);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });

      response.data.on('error', (error) => {
        onChunk(null, false, error.message);
      });

    } catch (error) {
      console.error('Moonshot 流式 API 错误:', error.message);
      onChunk(null, false, error.message);
    }
  }
}

module.exports = new MoonshotClient();
