# AI 数据收集方案

## 目标
收集用户在使用应用过程中产生的所有行为数据，整理成 AI 容易理解的格式。

## 数据类型

1. **User Profile** - 用户画像和行为特征
2. **Habit Analytics** - 计划表现和模式分析  
3. **Check-in Details** - 每次打卡的详细上下文
4. **Couple Dynamics** - 伴侣互动和协同数据
5. **Time Series** - 每日时间序列数据用于趋势分析

## 存储位置

- 实时数据：MongoDB（主数据库）
- AI 训练数据：S3 存储桶 `ai-training-data/YYYY/MM/DD/`

## 文件格式

```jsonl
// 每行一个 JSON 对象
{"type": "user_profile", "userId": "hash", "timestamp": "...", "data": {...}}
{"type": "check_in", "checkInId": "...", "timestamp": "...", "data": {...}}
```

## 隐私保护

- 所有用户 ID 使用哈希值
- 敏感内容脱敏处理
- 用户可选择不参与 AI 训练
