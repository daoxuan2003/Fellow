# 阿里云宝塔面板手动部署教程

## 目录
1. [服务器准备](#一服务器准备)
2. [宝塔面板安装](#二宝塔面板安装)
3. [环境配置](#三环境配置)
4. [项目部署](#四项目部署)
5. [域名和SSL](#五域名和ssl配置)
6. [后续维护](#六后续维护)

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
```

创建数据库用户：
```bash
mongosh
```

在mongosh中执行：
```javascript
use couple_db
db.createUser({
  user: "couple",
  pwd: "你的密码",
  roles: [{ role: "readWrite", db: "couple_db" }]
})
```

### 4. 安装Git
```bash
yum install -y git
# 或 Ubuntu
apt-get install -y git
```

---

## 四、项目部署

### 1. 创建网站目录
在宝塔面板：
1. 点击左侧"文件"
2. 进入 `/www/wwwroot/`
3. 创建目录 `couple-website`

### 2. 上传代码
```bash
cd /www/wwwroot/couple-website
git clone https://github.com/你的用户名/你的仓库名.git .
```

### 3. 安装依赖
```bash
cd /www/wwwroot/couple-website/backend
npm install
```

### 4. 配置环境变量
创建 `.env` 文件：
```bash
cd /www/wwwroot/couple-website/backend
cp .env.example .env
vi .env
```

编辑 `.env` 文件：
```bash
# MongoDB连接字符串（带认证）
MONGODB_URI=mongodb://couple:你的密码@localhost:27017/couple_db?authSource=admin

# 服务器端口
PORT=3000

# WebSocket端口
WS_PORT=3001

# JWT密钥（生产环境请使用强密码，至少32位）
JWT_SECRET=your-production-secret-key-min-32-characters

# 环境标识
NODE_ENV=production
```

#### 推送通知配置（可选）
如需启用 iOS/Android PWA 原生推送通知：

1. 生成 VAPID 密钥对：
```bash
cd /www/wwwroot/couple-website/backend
npx web-push generate-vapid-keys
```

2. 将生成的密钥添加到 `.env`：
```bash
# VAPID 公钥（给前端使用，可公开）
VAPID_PUBLIC_KEY=BDxxxxxxxxxxxxxxxxxxxx...

# VAPID 私钥（仅后端使用，保密！）
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxx...

# 联系邮箱
VAPID_SUBJECT=mailto:your-email@example.com
```

3. 前端公钥已在代码中配置，如需更换，修改 `frontend/src/utils/notification.js`

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

修改配置：
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
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket代理
    location /ws/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

保存，重启Nginx：
```bash
nginx -t
systemctl reload nginx
```

### 7. 修改前端API地址

编辑 `frontend/index.html`、`frontend/home.html`、`frontend/profile.html`：

找到：
```javascript
apiUrl: 'http://localhost:3000/api'
```

改为你的域名：
```javascript
apiUrl: 'https://你的域名或IP/api'
```

还有WebSocket地址：
```javascript
this.ws = new WebSocket('ws://localhost:3001')
// 改为
this.ws = new WebSocket('wss://你的域名或IP:3001')
```

### 8. 测试访问
浏览器访问：`http://你的域名或IP`

---

## 五、域名和SSL配置

### 1. 购买域名
- 推荐：阿里云、腾讯云
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

## 六、后续维护

### 手动更新代码
```bash
# SSH登录服务器
ssh root@你的服务器IP

# 进入项目目录
cd /www/wwwroot/couple-website

# 拉取最新代码
git pull

# 安装新依赖（如果有）
cd backend
npm install

# 重启服务
pm2 restart couple-backend
```

### 常用命令
```bash
# 查看服务状态
pm2 status
pm2 logs

# 重启服务
pm2 restart couple-backend

# 查看Nginx日志
tail -f /www/wwwlogs/nginx_error.log

# MongoDB备份
mongodump -d couple_db -o /backup/

# MongoDB恢复
mongorestore -d couple_db /backup/couple_db/
```

### 数据备份
在宝塔面板：
1. 计划任务 → 添加任务
2. 任务类型：备份数据库
3. 执行周期：每天
4. 添加

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

### 3. 文件权限问题
```bash
chown -R www:www /www/wwwroot/couple-website
chmod -R 755 /www/wwwroot/couple-website
```

---

## 部署完成后的架构

```
用户浏览器
    ↓ HTTPS
阿里云ECS
    ├── Nginx (80/443端口)
    │   ├── 静态文件 (前端)
    │   └── /api/* → Node (3000端口)
    ├── Node.js后端 (3000端口)
    ├── WebSocket (3001端口)
    └── MongoDB (27017端口，仅本地)
```

有任何问题随时问我！
