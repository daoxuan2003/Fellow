// ============================================
// AI 助手路由
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const moonshotClient = require('../ai/services/moonshotClient');
const dataCollector = require('../ai/utils/dataCollector');
const prompts = require('../ai/prompts/habitAssistant');
const { logError } = require('../utils/safeLogger');

/**
 * @route   POST /api/ai/chat
 * @desc    与 AI 助手对话
 * @access  Private
 */
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { habitId, message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    // 收集计划数据（如果有 habitId）
    let context = {};
    if (habitId) {
      const habitData = await dataCollector.collectHabitData(habitId, userId);
      if (habitData) {
        context = {
          habit: habitData.habit,
          userStats: habitData.userStats
        };
      }
    }

    // 构建提示词
    const prompt = prompts.buildChatPrompt(context, history, message);

    // 调用 AI
    const messages = [
      { role: 'system', content: prompts.SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];

    const result = await moonshotClient.chat(messages, { temperature: 0.8 });

    if (!result.success) {
      logError('AI 聊天调用失败:', new Error(result.error || 'AI request failed'));
      return res.status(500).json({ success: false, message: 'AI 服务暂时不可用' });
    }

    res.json({
      success: true,
      reply: result.content,
      usage: result.usage
    });

  } catch (error) {
    logError('AI 聊天错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * @route   POST /api/ai/analyze-habit
 * @desc    分析指定计划
 * @access  Private
 */
router.post('/analyze-habit', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { habitId } = req.body;

    if (!habitId) {
      return res.status(400).json({ success: false, message: '计划 ID 不能为空' });
    }

    // 收集数据
    const habitData = await dataCollector.collectHabitData(habitId, userId);
    if (!habitData) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }

    // 构建分析提示词
    const prompt = prompts.buildAnalysisPrompt(habitData);

    // 调用 AI
    const result = await moonshotClient.chat(
      [
        { role: 'system', content: prompts.SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.7 }
    );

    if (!result.success) {
      logError('AI 分析调用失败:', new Error(result.error || 'AI request failed'));
      return res.status(500).json({ success: false, message: 'AI 服务暂时不可用' });
    }

    res.json({
      success: true,
      analysis: result.content,
      stats: habitData.userStats,
      partnerStats: habitData.partnerStats,
      usage: result.usage
    });

  } catch (error) {
    logError('AI 分析错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * @route   POST /api/ai/generate-plan
 * @desc    生成计划建议
 * @access  Private
 */
router.post('/generate-plan', authMiddleware, async (req, res) => {
  try {
    const { goal, currentStatus, timeBudget, constraints, hasPartner } = req.body;

    if (!goal) {
      return res.status(400).json({ success: false, message: '目标不能为空' });
    }

    // 构建生成提示词
    const prompt = prompts.buildPlanGenerationPrompt({
      goal,
      currentStatus,
      timeBudget,
      partnerSync: hasPartner,
      constraints
    });

    // 调用 AI（要求 JSON 输出）
    const result = await moonshotClient.chat(
      [
        { role: 'system', content: prompts.SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.8, jsonMode: true }
    );

    if (!result.success) {
      logError('AI 生成计划调用失败:', new Error(result.error || 'AI request failed'));
      return res.status(500).json({ success: false, message: 'AI 服务暂时不可用' });
    }

    // 解析 JSON
    let plan;
    try {
      plan = JSON.parse(result.content);
    } catch (e) {
      // 如果不是标准 JSON，直接返回文本
      plan = { raw: result.content };
    }

    res.json({
      success: true,
      plan,
      usage: result.usage
    });

  } catch (error) {
    logError('AI 生成计划错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * @route   GET /api/ai/health
 * @desc    检查 AI 服务状态
 * @access  Private
 */
router.get('/health', authMiddleware, async (req, res) => {
  try {
    // 测试调用 AI 接口
    const result = await moonshotClient.chat(
      [
        { role: 'user', content: '你好' }
      ],
      { maxTokens: 10 }
    );

    if (result.success) {
      res.json({
        success: true,
        status: 'ok',
        model: result.model,
        message: 'AI 服务正常'
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'error',
        message: 'AI 服务暂时不可用'
      });
    }
  } catch (error) {
    logError('AI 健康检查错误:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      message: 'AI 服务暂时不可用'
    });
  }
});

/**
 * @route   GET /api/ai/models
 * @desc    获取可用模型列表
 * @access  Private
 */
router.get('/models', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    models: moonshotClient.getAvailableModels()
  });
});

/**
 * @route   GET /api/ai/stream-chat
 * @desc    流式聊天（SSE）
 * @access  Private
 */
router.get('/stream-chat', authMiddleware, async (req, res) => {
  try {
    const { habitId, message } = req.query;
    const userId = req.userId;

    if (!message) {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 收集上下文
    let context = {};
    if (habitId) {
      const habitData = await dataCollector.collectHabitData(habitId, userId);
      if (habitData) {
        context = {
          habit: habitData.habit,
          userStats: habitData.userStats
        };
      }
    }

    // 构建消息
    const prompt = prompts.buildChatPrompt(context, [], message);
    const messages = [
      { role: 'system', content: prompts.SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];

    // 流式响应
    await moonshotClient.chatStream(
      messages,
      (chunk, isDone, error) => {
        if (error) {
          res.write(`data: ${JSON.stringify({ error })}\n\n`);
          res.end();
          return;
        }
        
        if (isDone) {
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }
        
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    );

  } catch (error) {
    logError('AI 流式聊天错误:', error);
    res.write(`data: ${JSON.stringify({ error: '服务器错误' })}\n\n`);
    res.end();
  }
});

module.exports = router;
