#!/bin/bash
# Fellow 项目版本号升级脚本
# 用法: ./bump-version.sh <type>
# 示例: ./bump-version.sh minor

TYPE=$1

if [ -z "$TYPE" ]; then
    echo "用法: ./bump-version.sh <type>"
    echo ""
    echo "升级类型:"
    echo "  major  - 大版本（不兼容改动）"
    echo "  minor  - 新功能（向下兼容）"
    echo "  patch  - Bug 修复"
    echo ""
    echo "示例:"
    echo "  ./bump-version.sh minor    # 1.0.0 -> 1.1.0"
    echo "  ./bump-version.sh patch    # 1.1.0 -> 1.1.1"
    exit 1
fi

# 读取当前版本
if [ ! -f "frontend_source/public/version.json" ]; then
    echo "错误: 找不到 version.json 文件"
    exit 1
fi

CURRENT_VERSION=$(grep -o '"version": "[^"]*"' frontend_source/public/version.json | cut -d'"' -f4)

echo "当前版本: ${CURRENT_VERSION}"

# 解析版本号
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

# 计算新版本
case $TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "错误: 无效的升级类型 '$TYPE'"
        exit 1
        ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "新版本: ${NEW_VERSION}"

# 更新 version.json
sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" frontend_source/public/version.json

# 更新 buildTime
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/\"buildTime\": \"[^\"]*\"/\"buildTime\": \"${BUILD_TIME}\"/" frontend_source/public/version.json

echo ""
echo "✅ 版本已更新到 ${NEW_VERSION}"
echo ""
echo "接下来:"
echo "1. 更新 version.json 中的 changelog"
echo "2. git add -A"
echo "3. git commit -m \"chore(release): v${NEW_VERSION}\""
echo "4. git tag -a v${NEW_VERSION} -m \"v${NEW_VERSION}\""
