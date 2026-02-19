#!/bin/bash

# 部署脚本 - 在服务器上执行

echo "🚀 开始部署..."

# 进入项目目录
cd /var/www/情侣网站

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install --production
cd ..

# 构建前端
echo "🔨 构建前端..."
cd frontend_source
npm install
npm run build
cd ..

# 重启 PM2
echo "🔄 重启服务..."
pm2 reload ecosystem.config.js

echo "✅ 部署完成！"
