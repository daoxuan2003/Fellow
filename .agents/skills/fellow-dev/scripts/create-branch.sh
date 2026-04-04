#!/bin/bash
# Fellow 项目功能分支创建脚本
# 用法: ./create-branch.sh <type> <name>
# 示例: ./create-branch.sh feature express-delivery

TYPE=$1
NAME=$2

if [ -z "$TYPE" ] || [ -z "$NAME" ]; then
    echo "用法: ./create-branch.sh <type> <name>"
    echo ""
    echo "分支类型:"
    echo "  feature   - 新功能"
    echo "  fix       - Bug 修复"
    echo "  docs      - 文档更新"
    echo "  refactor  - 重构"
    echo "  style     - 样式调整"
    echo ""
    echo "示例:"
    echo "  ./create-branch.sh feature express-delivery"
    echo "  ./create-branch.sh fix profile-sync"
    exit 1
fi

# 验证分支类型
VALID_TYPES=("feature" "fix" "docs" "refactor" "style")
VALID=0
for t in "${VALID_TYPES[@]}"; do
    if [ "$t" == "$TYPE" ]; then
        VALID=1
        break
    fi
done

if [ $VALID -eq 0 ]; then
    echo "错误: 无效的分支类型 '$TYPE'"
    echo "有效类型: feature, fix, docs, refactor, style"
    exit 1
fi

BRANCH_NAME="${TYPE}/${NAME}"

echo "🚀 创建 ${BRANCH_NAME} 分支..."

git checkout develop
git pull origin develop
git checkout -b "$BRANCH_NAME"

echo ""
echo "✅ 分支 ${BRANCH_NAME} 创建成功！"
echo ""
echo "接下来:"
echo "1. 开始开发工作"
echo "2. 提交时使用规范: git commit -m \"${TYPE}: 简短描述\""
echo "3. 完成后推送: git push origin ${BRANCH_NAME}"
