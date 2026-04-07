---
name: fellow-dev
description: Fellow（共赴）项目开发规范指南。当 Kimi 在 Fellow 项目中检测到以下场景时自动使用：Git 操作（创建分支、提交代码、合并分支、打 tag）、代码提交（编写提交信息、选择 commit type）、功能开发（开始新功能、创建 feature 分支）、Bug 修复（创建 fix 分支、修复问题）、版本发布（更新版本号、发布新版本）、代码审查（合并到 develop/main）、项目初始化（克隆项目、开始开发）。提供 Git 工作流指导、分支命名规范、提交信息格式、版本号管理和发布流程。
---

# Fellow 项目开发规范

此 skill 提供 Fellow（共赴）情侣应用的完整开发工作流指导。

## Git 分支策略

### 主分支
| 分支 | 用途 |
|------|------|
| `main` | 生产环境，只有经过测试的代码才能合并 |
| `develop` | 开发环境，日常开发在此分支进行 |

### 功能分支命名规范
```
feature/<功能名>      # 新功能，如 feature/express-delivery
fix/<问题描述>        # Bug 修复，如 fix/profile-sync
docs/<文档名>         # 文档更新
refactor/<模块名>     # 重构
style/<描述>          # 样式调整
```

## 工作流程

### 1. 开始新功能
```bash
git checkout develop
git pull origin develop
git checkout -b feature/xxx
```

### 2. 提交规范
```bash
git add -A
git commit -m "type: 简短描述

详细说明（可选）"
```

**type 类型：**
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档
- `style` - 格式调整（不影响代码逻辑）
- `refactor` - 重构
- `chore` - 构建/工具/配置

### 3. 合并到 develop（重要）
**所有修改必须经过审查才能合并到 develop**

1. 在功能/修复分支完成开发和提交
2. **不要直接推送到 develop**，应该提交让用户审查
3. 用户审查同意后，再执行合并

```bash
# 完成开发后提交
git add -A
git commit -m "fix: 修复某问题"

# 推送分支到远程（供审查）
git push origin feature/xxx

# 等待用户审查同意后，用户执行以下命令合并：
git checkout develop
git merge feature/xxx
git push origin develop
git branch -d feature/xxx
```

### 4. 发布版本（上线）

当用户说"上线"或"发布版本"时，触发完整的版本发布流程：

1. **查看上次版本以来的所有修改**
   ```bash
   # 查看上次 tag 到现在的所有 commit
   git log 上次版本号..HEAD --oneline
   
   # 例如：从 v4.0.1 到现在
   git log v4.0.1..HEAD --oneline
   ```

2. **生成规范的 changelog**
   - 过滤掉 `debug:`、`chore(release):`、`Merge branch` 等无关提交
   - 使用图标分类：✨ 新功能、🐛 修复、💄 样式、⚡ 优化

3. **更新 `frontend_source/public/version.json`**
   - 更新 version 和 buildTime
   - 在 changelog 数组首部添加新版本记录
   - **重要：保留所有历史版本记录，不要删除旧的！**

4. **合并到 main 分支**
   ```bash
   git checkout main
   git merge develop
   ```

5. **打 tag**
   ```bash
   git tag -a v1.x.x -m "v1.x.x 版本说明"
   ```

6. **推送到远程**
   ```bash
   git push origin main
   git push origin v1.x.x
   ```

**版本文件位置**: `frontend_source/public/version.json`

```bash
# 1. 检查并清理本地构建产物（重要！避免推送不必要文件）
# PowerShell: Remove-Item -Recurse -Force "frontend/dist"
# Bash: rm -rf frontend/dist

# 2. 更新 version.json（frontend_source/public/version.json）
#    - 版本号、buildTime、在 changelog 首部添加新版本记录

# 3. 合并到 main
git checkout main
git merge develop

# 4. 提交 release（只在 main 分支）
git add -A
git commit -m "chore(release): v1.x.x

- 修复xxx
- 新增xxx"

# 5. 打 tag
git tag -a v1.x.x -m "v1.x.x 版本说明

- 修复xxx
- 新增xxx"

# 6. 推送到远程
git push origin main
git push origin v1.x.x
```

## 版本号规范

语义化版本：`MAJOR.MINOR.PATCH`

| 位置 | 含义 | 升级时机 |
|------|------|----------|
| MAJOR | 大版本 | 不兼容的改动 |
| MINOR | 新功能 | 向下兼容的新功能 |
| PATCH | 补丁 | Bug 修复 |

**示例：**
- 新增代取快递功能：`1.0.0` → `1.1.0`
- 修复头像显示问题：`1.1.0` → `1.1.1`
- 重大改版：`1.1.1` → `2.0.0`

## 重要注意事项

1. **不要直接提交到 main**，必须通过 develop 合并
2. **不要直接推送到 develop**，必须经过用户审查同意
3. **feature 分支用完后及时删除**
4. **tag 不要删除**，保留历史版本
5. **提交前检查**是否包含不必要的文件（如 .log, .temp）
6. **不要在本地执行 npm run build**，构建由服务器自动完成，frontend/dist 目录不应存在于本地或远程仓库

## 辅助脚本

Skill 目录下提供以下实用脚本：

### create-branch.sh - 创建规范的功能分支
```bash
# 使用脚本（推荐）
./.agents/skills/fellow-dev/scripts/create-branch.sh feature express-delivery

# 输出:
# 🚀 创建 feature/express-delivery 分支...
# ✅ 分支创建成功！
```

### bump-version.sh - 版本号升级
```bash
# 升级 minor 版本（1.0.0 -> 1.1.0）
./.agents/skills/fellow-dev/scripts/bump-version.sh minor

# 升级 patch 版本（1.1.0 -> 1.1.1）
./.agents/skills/fellow-dev/scripts/bump-version.sh patch
```

## 常用命令速查

```bash
# 查看分支
git branch -a

# 查看状态
git status

# 查看提交历史
git log --oneline -10

# 放弃修改（谨慎使用）
git checkout -- <文件名>
git reset --hard HEAD

# 解决冲突后重新提交
git add -A
git commit -m "fix: 解决合并冲突"
```

## 项目架构速览

- **前端**: `frontend_source/` - Vue 3 + Vite + Pinia
- **后端**: `backend/` - Express + MongoDB
- **页面组件**: `frontend_source/src/views/`
- **API 路由**: `backend/routes/`
- **数据模型**: `backend/models/`
- **认证方式**: JWT (`Authorization: Bearer <token>`)
- **coupleId 规则**: `[userId, partnerId].sort().join('_')` - 数据隔离核心键
