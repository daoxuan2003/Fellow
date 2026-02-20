#!/bin/bash
# 在服务器上运行这个脚本

cd /www/wwwroot/couple-website

echo "📥 拉取代码..."
git pull origin main

echo "🔢 更新版本号（自动递增）..."
node update-version.js

echo "📦 后端依赖..."
cd backend && npm install --production && cd ..

echo "🔨 构建前端..."
cd frontend_source
npm install
npm run build
cd ..

echo "📂 复制 dist..."
rm -rf frontend/dist
cp -r frontend_source/dist frontend/

echo "🔄 重启 PM2..."
pm2 reload ecosystem.config.js

echo "✅ 部署完成！"
cat frontend_source/public/version.json
