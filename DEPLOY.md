# 阿里云宝塔面板部署教程 + GitHub自动化

## 目录
1. [服务器准备](#一服务器准备)
2. [宝塔面板安装](#二宝塔面板安装)
3. [环境配置](#三环境配置)
4. [项目部署](#四项目部署)
5. [GitHub自动化部署](#五github自动化部署)
6. [域名和SSL](#六域名和ssl配置)
7. [后续维护](#七后续维护)

---

## 一、服务器准备

### 1. 购买阿里云ECS
- 推荐配置：2核4G 内存，5M带宽（情侣网站流量不大，这个够用）
- 系统：CentOS 8.2 64位 或 Ubuntu 20.04
- 地域：选择离你用户最近的地区

### 2. 安全组配置
在阿里云控制台 → 安全组 → 配置规则，开放以下端口：

| 端口 | 用途 | 授权对象 |
|------|------|----------|
| 22 | SSH远程连接 | 你的IP |
| 80 | HTTP访问 | 0.0.0.0/0 |
| 443 | HTTPS访问 | 0.0.0.0/0 |
| 8888 | 宝塔面板 | 你的IP（后续可限制）|
| 3000 | Node后端 | 0.0.0.0/0 |
| 3001 | WebSocket | 0.0.0.0/0 |
| 27017 | MongoDB | 127.0.0.1（仅本机）|

---

## 二、宝塔面板安装

### 1. 连接服务器
```bash
ssh root@你的服务器IP
```

### 2. 安装宝塔面板（CentOS）
```bash
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec
```

如果是Ubuntu：
```bash
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

### 3. 保存登录信息
安装完成后会显示：
```
外网面板地址: http://你的IP:8888/随机字符
内网面板地址: http://内网IP:8888/随机字符
username: xxxxxxxx
password: xxxxxxxx
```

**重要**：截图保存这些信息！

### 4. 登录宝塔面板
1. 浏览器访问 `http://你的IP:8888/随机字符`
2. 输入用户名密码登录
3. 绑定宝塔账号（没有就注册一个）

### 5. 安装基础环境
宝塔会弹出"推荐安装套件"，选择：
- **Nginx 1.22**（Web服务器）
- **MySQL 5.7**（可以先装，虽然我们用MongoDB）
- **Pure-Ftpd 1.0.49**（文件传输，可选）
- **phpMyAdmin 5.0**（数据库管理，可选）

点击"一键安装"，等待完成（约10-20分钟）

---

## 三、环境配置

### 1. 安装Node.js
在宝塔面板：
1. 点击左侧"软件商店"
2. 搜索 "Node"
3. 安装 "Node.js版本管理器 2.0"
4. 安装完成后，打开"Node.js版本管理器"
5. 安装 Node.js 18.17.0（LTS版本）

或者命令行安装：
```bash
# 使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v  # 验证安装
```

### 2. 安装PM2（进程管理器）
```bash
npm install -g pm2
```

### 3. 安装MongoDB
在宝塔面板：
1. 软件商店 → 搜索 "Mongo"
2. 安装 "MongoDB 6.0"
3. 安装完成后设置密码：
   - 点击MongoDB的"设置"
   - 配置密码认证
   - 记住用户名密码

命令行方式：
```bash
# 添加MongoDB源
cat > /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# 安装
yum install -y mongodb-org

# 启动
systemctl start mongod
systemctl enable mongod

# 创建管理员用户
mongosh
```

在mongosh中执行：
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "你的密码",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase"]
})
```

### 4. 安装Git
```bash
yum install -y git
# 或 Ubuntu
apt-get install -y git
```

配置Git：
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

---

## 四、项目部署

### 1. 创建网站目录
在宝塔面板：
1. 点击左侧"文件"
2. 进入 `/www/wwwroot/`
3. 创建目录 `couple-website`

### 2. 上传代码

#### 方式一：Git克隆（推荐）
```bash
cd /www/wwwroot/couple-website
git clone https://github.com/你的用户名/你的仓库名.git .
```

#### 方式二：宝塔上传
1. 在GitHub下载代码zip包
2. 宝塔文件管理器 → 上传
3. 解压到当前目录

### 3. 安装依赖
```bash
cd /www/wwwroot/couple-website/backend
npm install
```

### 4. 修改后端配置
编辑 `server.js`，修改数据库连接：
```javascript
// 原来
mongoose.connect('mongodb://localhost:27017/couple_db')

// 改为（如果有认证）
mongoose.connect('mongodb://admin:你的密码@localhost:27017/couple_db?authSource=admin')
```

### 5. 使用PM2启动后端
```bash
cd /www/wwwroot/couple-website/backend
pm2 start server.js --name "couple-backend"

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 6. 配置Nginx反向代理

在宝塔面板：
1. 点击左侧"网站"
2. 点击"添加站点"
   - 域名：输入你的域名（暂时没有就填服务器IP）
   - 根目录：`/www/wwwroot/couple-website/frontend`
   - PHP版本：纯静态
3. 点击"提交"

4. 点击刚创建的网站 → "设置" → "配置文件"

修改配置，添加反向代理：
```nginx
server {
    listen 80;
    server_name 你的域名或IP;
    root /www/wwwroot/couple-website/frontend;
    index index.html;
    
    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket代理
    location /ws/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

保存，重启Nginx。

### 7. 修改前端API地址

编辑 `frontend/index.html` 和 `frontend/home.html` 和 `frontend/profile.html`：

找到：
```javascript
apiUrl: 'http://localhost:3000/api'
```

改为你的域名：
```javascript
apiUrl: 'http://你的域名或IP/api'
```

还有WebSocket地址：
```javascript
this.ws = new WebSocket('ws://localhost:3001')
// 改为
this.ws = new WebSocket('ws://你的域名或IP:3001')
```

### 8. 测试访问
浏览器访问：`http://你的域名或IP`

---

## 五、GitHub自动化部署

实现效果：代码push到GitHub → 服务器自动拉取更新 → 自动重启服务

### 1. 服务器生成SSH密钥
```bash
ssh-keygen -t rsa -b 4096 -C "你的邮箱"
# 一路回车，使用默认路径
cat ~/.ssh/id_rsa.pub
```

复制输出的公钥内容。

### 2. 添加GitHub部署密钥
1. 打开GitHub仓库 → Settings → Deploy keys
2. 点击 "Add deploy key"
3. Title：填 "阿里云服务器"
4. Key：粘贴刚才的公钥
5. 勾选 "Allow write access"（如果需要自动push的话）
6. 点击 "Add key"

### 3. 测试Git连接
```bash
cd /www/wwwroot/couple-website
ssh -T git@github.com
# 看到 "Hi xxx! You've successfully authenticated" 表示成功
```

### 4. 创建自动部署脚本
创建 `/www/wwwroot/deploy.sh`：

```bash
#!/bin/bash

# 部署脚本
echo "========== 开始部署 =========="
cd /www/wwwroot/couple-website

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 安装依赖（如果有更新）
echo "安装依赖..."
cd backend
npm install

# 重启PM2服务
echo "重启服务..."
pm2 restart couple-backend

echo "========== 部署完成 =========="
```

设置权限：
```bash
chmod +x /www/wwwroot/deploy.sh
```

### 5. 创建Webhook接收服务

创建 `/www/wwwroot/couple-website/webhook.js`：

```javascript
const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

// Webhook密钥（在GitHub设置）
const WEBHOOK_SECRET = '你的Webhook密钥';

const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/webhook') {
        res.statusCode = 404;
        res.end('Not Found');
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        // 验证GitHub签名
        const signature = req.headers['x-hub-signature-256'];
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        hmac.update(body);
        const expectedSignature = 'sha256=' + hmac.digest('hex');

        if (signature !== expectedSignature) {
            res.statusCode = 403;
            res.end('Invalid signature');
            return;
        }

        // 执行部署脚本
        console.log('收到GitHub Webhook，开始部署...');
        exec('/www/wwwroot/deploy.sh', (error, stdout, stderr) => {
            if (error) {
                console.error('部署失败:', error);
                res.statusCode = 500;
                res.end('Deployment failed');
                return;
            }
            console.log('部署成功:', stdout);
            res.statusCode = 200;
            res.end('Deployment successful');
        });
    });
});

server.listen(9000, '127.0.0.1', () => {
    console.log('Webhook服务器运行在 http://127.0.0.1:9000');
});
```

用PM2启动Webhook服务：
```bash
cd /www/wwwroot/couple-website
pm2 start webhook.js --name "github-webhook"
pm2 save
```

### 6. 配置Nginx转发Webhook

在宝塔Nginx配置中添加：
```nginx
location /webhook {
    proxy_pass http://127.0.0.1:9000/webhook;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 7. GitHub配置Webhook

1. 打开GitHub仓库 → Settings → Webhooks
2. 点击 "Add webhook"
3. Payload URL：`http://你的域名/webhook`
4. Content type：`application/json`
5. Secret：填写你设置的WEBHOOK_SECRET
6. 选择 "Just the push event"
7. 勾选 "Active"
8. 点击 "Add webhook"

### 8. 测试自动部署

在本地修改代码，push到GitHub：
```bash
git add .
git commit -m "测试自动部署"
git push origin main
```

查看GitHub Webhook的Recent Deliveries，看是否显示绿色对勾。

在服务器查看日志：
```bash
pm2 logs github-webhook
pm2 logs couple-backend
```

---

## 六、域名和SSL配置

### 1. 购买域名
- 推荐：阿里云、腾讯云、namesilo
- 购买后实名认证

### 2. 解析域名到服务器
在域名管理后台添加A记录：
- 主机记录：@（根域名）或 www（子域名）
- 记录值：你的服务器IP
- TTL：默认

### 3. 宝塔配置SSL证书
1. 宝塔面板 → 网站 → 点击网站 → SSL
2. 选择 "Let's Encrypt"（免费）
3. 勾选域名，点击申请
4. 开启 "强制HTTPS"

### 4. 修改前端为HTTPS
把所有 `http://` 改为 `https://`，包括：
- apiUrl
- WebSocket地址（ws://改为wss://）

---

## 七、后续维护

### 常用命令
```bash
# 查看服务状态
pm2 status
pm2 logs

# 重启服务
pm2 restart couple-backend
pm2 restart github-webhook

# 更新代码后手动部署
cd /www/wwwroot/couple-website
git pull
pm2 restart couple-backend

# 查看Nginx日志
tail -f /www/wwwlogs/nginx_error.log

# MongoDB备份
mongodump -d couple_db -o /backup/

# MongoDB恢复
mongorestore -d couple_db /backup/couple_db/
```

### 数据备份（重要！）
在宝塔面板：
1. 计划任务 → 添加任务
2. 任务类型：备份数据库
3. 执行周期：每天
4. 添加

### 性能监控
1. 安装宝塔监控插件
2. 配置告警（CPU、内存、磁盘超过80%通知）

---

## 可能遇到的问题

### 1. MongoDB连接失败
- 检查MongoDB是否运行：`systemctl status mongod`
- 检查防火墙：确保27017端口只对本地开放
- 检查认证：确保用户名密码正确

### 2. WebSocket连接失败
- 检查3001端口是否在安全组开放
- 检查Nginx配置是否正确
- 查看WebSocket日志：`pm2 logs couple-backend`

### 3. 自动部署不生效
- 检查Webhook日志：`pm2 logs github-webhook`
- 检查GitHub Webhook的Recent Deliveries
- 手动运行 `/www/wwwroot/deploy.sh` 看报错

### 4. 文件权限问题
```bash
chown -R www:www /www/wwwroot/couple-website
chmod -R 755 /www/wwwroot/couple-website
```

---

## 总结

部署完成后的架构：
```
用户浏览器
    ↓ HTTPS
阿里云ECS
    ├── Nginx (80/443端口)
    │   ├── 静态文件 (前端)
    │   ├── /api/* → Node (3000端口)
    │   └── /webhook → Webhook服务 (9000端口)
    ├── Node.js后端 (3000端口)
    ├── WebSocket (3001端口)
    ├── Webhook服务 (9000端口)
    └── MongoDB (27017端口，仅本地)
```

有任何问题随时问我！
