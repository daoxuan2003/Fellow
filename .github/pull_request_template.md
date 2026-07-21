## 目标与变更

<!-- 用户完成后能得到什么？本 PR 做了哪些最小完整修改？ -->

## 关联任务

Fixes #

工作项：`.ai/tasks/<id>.json`

- [ ] 工作项状态为 `review_ready`
- [ ] 已运行 `work-item-check.mjs`

## 验收条件

- [ ] 正常路径已实现
- [ ] 失败/空状态已实现
- [ ] 情侣数据、权限或实时同步路径已验证（如适用）

## 事实、未知与假设

### VERIFIED
- 待填写

### UNKNOWN
- 待填写

### ASSUMED_FOR_TASK
- 无 / 待填写

## 范围

### In scope
- 待填写

### Out of scope
- 待填写

## 数据、环境与兼容性

- 数据所有权/伴侣可见性：无影响 / 说明
- 模型、索引或迁移：无影响 / 说明
- 环境变量或服务器能力：无影响 / 说明
- 历史数据兼容：无影响 / 说明
- 部署与回滚：

## 设计与体验

变更分类：无可见 UI / behavior-only / local-style / shared-component / token-change / new-flow

- [ ] 已读取 `DESIGN_SYSTEM.md`、Token/组件规则和 UI 验收协议
- [ ] 已运行 design-contract-check 与 ui-diff-report
- [ ] 已检查适用的 320 / 375 / 430 宽度
- [ ] 已检查适用的 loading / empty / error / long-content / keyboard / safe-area / partner-update 状态
- [ ] 已提供仅含合成数据的截图/录屏和 evidence manifest（可见 UI 变化时）
- [ ] 新 Token、组件家族或视觉方向已经产品负责人批准（如适用）

## 验证证据

### Passed
- 待填写

### Failed
- 无 / 待填写

### Not run
- 无 / 待填写

## AI 自检

- [ ] 未信任客户端提交的用户/情侣身份
- [ ] 数据库成功写入后才发送实时/推送事件
- [ ] 未删除不明确的历史兼容逻辑
- [ ] 未提交密钥、真实隐私数据、日志、临时文件或构建产物
- [ ] 已检查完整 diff，并更新工作项与未完成工作的 `ACTIVE_WORK.md`
- [ ] 已生成或核对 AI handoff / PR body，未依赖聊天历史补全事实
