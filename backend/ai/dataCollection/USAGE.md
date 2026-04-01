# AI 数据收集使用指南

## 快速开始

### 1. 启动定时任务

在 server.js 中启动数据收集调度器：

```javascript
const dataScheduler = require('./ai/dataCollection/scheduler');

// 启动 AI 数据收集（可选，默认不启用）
if (process.env.ENABLE_AI_DATA_COLLECTION === 'true') {
  dataScheduler.start();
}
```

### 2. 配置环境变量

```bash
# .env 文件

# 启用 AI 数据收集
ENABLE_AI_DATA_COLLECTION=true

# S3 存储配置（用于存储训练数据）
STORAGE_MODE=s3
S3_ENDPOINT=https://s3.example.com
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret
S3_BUCKET=your-bucket
```

### 3. 使用中间件实时收集

在路由中使用中间件：

```javascript
const { collectAfterCheckIn } = require('./ai/dataCollection/middleware');

// 打卡路由添加数据收集
router.post('/:id/checkin', authMiddleware, collectAfterCheckIn, async (req, res) => {
  // ... 打卡逻辑
});
```

### 4. 手动导出数据

```javascript
const collector = require('./ai/dataCollection/collector');

// 导出单个用户的数据
const filePath = await collector.exportUserData('user_id');
console.log('数据已导出到:', filePath);
```

## 在 AI 对话中使用收集的数据

### 方案 A：实时查询（推荐）

在 AI 路由中实时查询收集的数据：

```javascript
// routes/ai.js
const collector = require('../ai/dataCollection/collector');

router.post('/chat', authMiddleware, async (req, res) => {
  const { habitId, message } = req.body;
  const userId = req.userId;
  
  // 收集用户画像数据
  const userProfile = await collector.collectUserProfile(userId);
  
  // 收集计划分析数据
  const habitAnalytics = await collector.collectHabitAnalytics(habitId, userId);
  
  // 构建包含个人数据的提示词
  const prompt = `
    用户画像: ${JSON.stringify(userProfile.data)}
    计划分析: ${JSON.stringify(habitAnalytics.data)}
    
    用户问题: ${message}
  `;
  
  // 调用 AI...
});
```

### 方案 B：使用预收集的数据

如果数据已经导出到 S3，可以从 S3 读取：

```javascript
const { storageService } = require('../services/storage');

// 读取用户的历史数据
const dataKey = `ai-training-data/2026/04/01/hash_userId.jsonl`;
const data = await storageService.downloadBuffer(dataKey);
const records = data.toString().split('\n').map(line => JSON.parse(line));

// 分析历史模式
const patterns = analyzePatterns(records);
```

## 数据格式示例

### 用户画像数据

```json
{
  "type": "user_profile",
  "userId": "a1b2c3d4e5f6",
  "timestamp": "2026-04-01T12:00:00Z",
  "data": {
    "basicInfo": {
      "joinDate": "2026-01-15",
      "gender": "male",
      "hasPartner": true
    },
    "behavioralTraits": {
      "preferredCheckInTime": "21:30",
      "consistencyScore": 0.78,
      "resilienceScore": 0.65
    }
  }
}
```

### 计划分析数据

```json
{
  "type": "habit_analytics",
  "userId": "a1b2c3d4e5f6",
  "planId": "f6e5d4c3b2a1",
  "timestamp": "2026-04-01T12:00:00Z",
  "data": {
    "planProfile": {
      "title": "健身",
      "type": "subtasks",
      "frequency": "weekly"
    },
    "performance": {
      "completionRate": 0.75,
      "perfectRate": 0.40
    },
    "patterns": {
      "failurePatterns": ["常在周日中断", "常在深夜打卡"],
      "successFactors": ["早上执行力强"]
    }
  }
}
```

### 打卡详情数据

```json
{
  "type": "check_in_detail",
  "checkInId": "c3b2a1f6e5d4",
  "userId": "a1b2c3d4e5f6",
  "planId": "f6e5d4c3b2a1",
  "timestamp": "2026-04-01T12:00:00Z",
  "data": {
    "date": "2026-04-01",
    "context": {
      "dayOfWeek": 2,
      "hourOfDay": 20
    },
    "performance": {
      "completedSubTasks": 2,
      "totalSubTasks": 3,
      "isPerfect": false,
      "mood": "happy"
    }
  }
}
```

## AI Prompt 示例

使用收集的数据生成个性化建议：

```javascript
function buildPersonalizedPrompt(userProfile, habitAnalytics, userMessage) {
  return `
你是用户的专属习惯养成教练。以下是用户的个人数据：

【用户画像】
- 注册时间：${userProfile.data.basicInfo.joinDate}
- 完成一致性：${(userProfile.data.behavioralTraits.consistencyScore * 100).toFixed(0)}%
- 抗挫折能力：${(userProfile.data.behavioralTraits.resilienceScore * 100).toFixed(0)}%
- 偏好打卡时间：${userProfile.data.behavioralTraits.preferredCheckInTime}

【当前计划表现】
- 计划名称：${habitAnalytics.data.planProfile.title}
- 完成率：${(habitAnalytics.data.performance.completionRate * 100).toFixed(0)}%
- 完美打卡率：${(habitAnalytics.data.performance.perfectRate * 100).toFixed(0)}%

【发现的问题】
${habitAnalytics.data.patterns.failurePatterns.map(p => `- ${p}`).join('\n')}

【优势】
${habitAnalytics.data.patterns.successFactors.map(f => `- ${f}`).join('\n')}

基于以上数据，请给出具体的、个性化的建议。不要说"你要坚持"这种泛泛而谈的话，要根据数据指出具体问题和解决方案。

用户问：${userMessage}
`;
}
```

## 隐私注意事项

1. **数据脱敏**
   - 所有用户 ID 使用 SHA-256 哈希
   - 地理位置精确到城市
   - 笔记内容可选择性排除

2. **用户控制**
   - 用户可以在设置中关闭 AI 数据收集
   - 用户可以请求导出或删除自己的数据

3. **访问控制**
   - AI 服务只能访问脱敏后的数据
   - 原始数据不离开应用数据库

## 故障排查

### 数据没有导出到 S3

检查：
1. STORAGE_MODE 是否设置为 's3'
2. S3 密钥是否正确配置
3. 存储桶是否有写入权限

### 收集的数据不完整

检查：
1. 中间件是否正确挂载
2. 定时任务是否启动
3. 数据库连接是否正常

### AI 建议不够个性化

检查：
1. 是否有足够的历史数据（至少 7 天）
2. Prompt 是否正确引用了收集的数据
3. 数据收集是否覆盖了用户的主要行为
