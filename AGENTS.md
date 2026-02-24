# Git 工作规范

## 分支策略

### 主分支
- `main` - 生产环境，只有经过测试的代码才能合并
- `develop` - 开发环境，日常开发在此分支进行

### 功能分支命名
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

### 3. 合并到 develop
```bash
git checkout develop
git merge feature/xxx
git push origin develop
git branch -d feature/xxx
```

### 4. 发布版本
```bash
# 1. 合并到 main
git checkout main
git merge develop

# 2. 更新 version.json
# 3. 提交 release（只在 main 分支）
git add -A
git commit -m "chore(release): v1.x.x"

# 4. 推送并打 tag
git push origin main
git tag -a v1.x.x -m "版本说明"
git push origin v1.x.x
```

## 版本号规范

语义化版本：`MAJOR.MINOR.PATCH`

- **MAJOR** - 大版本，不兼容的改动
- **MINOR** - 新功能，向下兼容
- **PATCH** - Bug 修复

**示例：**
- 新增代取快递功能：`1.0.0` → `1.1.0`
- 修复头像显示问题：`1.1.0` → `1.1.1`
- 重大改版：`1.1.1` → `2.0.0`

## 注意事项

1. **不要直接提交到 main**，必须通过 develop 合并
2. **feature 分支用完后及时删除**
3. **tag 不要删除**，保留历史版本
4. **提交前检查**是否包含不必要的文件（如 .log, .temp）

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
