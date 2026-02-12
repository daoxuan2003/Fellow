#!/bin/bash

# 阿里云宝塔一键部署脚本
# 使用方法：
# 1. 先安装宝塔面板
# 2. ssh登录服务器
# 3. 运行：curl -fsSL https://raw.githubusercontent.com/你的仓库/main/deploy-scripts/setup.sh | bash

echo "================================"
echo "  情侣网站一键部署脚本"
echo "================================"

# 颜色输出
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

# 检查root权限
if [ "$EUID" -ne 0 ]; then 
    red "请使用 root 用户运行此脚本"
    exit 1
fi

# 1. 安装基础软件
echo ""
yellow "[1/7] 安装基础软件..."
yum install -y git curl wget vim

# 2. 安装Node.js
echo ""
yellow "[2/7] 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
fi
node -v
npm -v

# 3. 安装PM2
echo ""
yellow "[3/7] 安装PM2..."
npm install -g pm2

# 4. 安装MongoDB
echo ""
yellow "[4/7] 安装MongoDB..."
if ! command -v mongod &> /dev/null; then
    cat > /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF
    yum install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    
    # 创建数据库用户
    mongosh couple_db --eval '
    db.createUser({
        user: "couple",
        pwd: "couple123456",
        roles: [{ role: "readWrite", db: "couple_db" }]
    })
    ' || echo "用户可能已存在，继续..."
fi

# 5. 创建项目目录
echo ""
yellow "[5/7] 创建项目目录..."
mkdir -p /www/wwwroot/couple-website
cd /www/wwwroot/couple-website

# 6. 提示用户克隆代码
echo ""
yellow "[6/7] 准备部署..."
green "请手动执行以下命令部署代码："
echo ""
echo "cd /www/wwwroot/couple-website"
echo "git clone https://github.com/你的用户名/你的仓库.git ."
echo "cd backend"
echo "npm install"
echo "pm2 start server.js --name couple-backend"
echo "pm2 save"
echo ""

# 7. 配置防火墙
echo ""
yellow "[7/7] 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=3001/tcp
    firewall-cmd --reload
fi

green "================================"
green "  基础环境安装完成！"
green "================================"
echo ""
echo "MongoDB用户名: couple"
echo "MongoDB密码: couple123456"
echo "数据库名: couple_db"
echo ""
echo "下一步："
echo "1. 将代码克隆到 /www/wwwroot/couple-website"
echo "2. 在宝塔面板添加网站"
echo "3. 配置Nginx反向代理"
echo "4. 配置SSL证书"
echo ""
