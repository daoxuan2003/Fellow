<p align="center">
  <img src="heart.svg" width="80" height="80" alt="共赴" />
</p>

<h1 align="center">共赴 Fellow</h1>

<p align="center">
  一个只属于你们两个人的私密小世界 💕
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb" />
  <img src="https://img.shields.io/badge/PWA-Supported-5A0FC8?logo=pwa" />
  <img src="https://img.shields.io/badge/License-MIT-blue" />
</p>

---

## ✨ 特性

- **👫 双人绑定** — 以情侣为单元隔离数据，只有绑定双方可见
- **⚡ 实时同步** — WebSocket 长连接，一方的操作另一方即时收到通知
- **📱 PWA 体验** — 可添加到手机桌面，离线缓存，接近原生 App 的流畅感
- **📦 取件清单** — 快递代取任务管理，紧急置顶，取件状态实时同步
- **🎯 坚持计划** — 简单打卡、子任务、数值记录三种模式，支持提醒与趋势记录
- **🏆 成就系统** — 24 枚徽章，后端持久化，进度实时同步
- **🖼 共享相册** — 照片同步、美食日记、旅行护照，支持灯箱浏览与裁剪上传
- **💌 心愿墙** — 贴上彼此的愿望便利贴，标记优先级与目标日期
- **🩺 健康记录** — 双人体征、月经周期预测、心情日记和伴侣可见状态同步
- **🔔 推送通知** — 浏览器 Web Push，即使关闭页面也能收到 TA 的动态
- **☁️ 自动备份** — 数据库定时归档，支持本地上传或 S3 兼容存储

> 💡 **还有购物清单、化妆品管理、考研进度、预算账户等更多模块等你探索。**

---

## 📸 预览

> 截图与演示 GIF 即将补充，欢迎贡献你的使用截图！

---

## 🛠 技术栈

| 前端 | 后端 | 基础设施 |
|------|------|----------|
| Vue 3.5 + Vite 5 | Node.js + Express 4 | MongoDB 7 |
| Pinia 3 | Mongoose 7 | PM2 进程守护 |
| Vue Router 4 | WebSocket (`ws`) | Nginx 反向代理 |
| vant 4 (移动端) | JWT + bcryptjs | S3 兼容对象存储 |
| Cropper.js | Web Push (`web-push`) | 可选：VAPID 推送 |
| vite-plugin-pwa | Axios + Web Push | 自动数据库备份 |

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/Fellow.git
cd Fellow
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，配置 MongoDB URI、JWT Secret 等
npm install
npm run dev        # 默认端口 3000，WebSocket 端口 3001
```

### 3. 启动前端

```bash
cd ../frontend_source
npm install
npm run dev        # 默认端口 5173，自动代理 /api -> localhost:3000
```

打开浏览器访问 http://localhost:5173 即可开始使用。

---

## ⚙️ 关键环境变量

复制 `backend/.env.example` 为 `backend/.env` 并按需填写：

```env
# 必填
# 生产环境需使用支持事务的副本集、分片集群或 MongoDB Atlas
MONGODB_URI=mongodb://localhost:27017/fellow
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRES=7d

# 安全边界（同源部署时 CORS_ORIGINS 可留空）
CORS_ORIGINS=https://your-domain.com
TRUST_PROXY_HOPS=1

# 服务器
PORT=3000
WS_PORT=3001

# Web Push（可选，用于 PWA 离线通知）
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:you@example.com

# 对象存储（可选，默认本地存储）
STORAGE_MODE=s3
S3_ENDPOINT=https://s3.example.com
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET_NAME=xxx
```

---

## 📦 生产部署

```bash
# 1. 构建前端
cd frontend_source
npm install
npm run build          # 产物输出到 ../frontend/dist

# 2. 安装依赖并启动后端
cd ../backend
npm install --production

# 3. 使用 PM2 守护进程
pm2 start ecosystem.config.js
```

**Nginx 反向代理示例：**

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    root /path/to/Fellow/frontend/dist;
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## 📁 项目结构

```
Fellow/
├── backend/               # Node.js + Express 后端
│   ├── server.js          # 服务入口（HTTP + WebSocket）
│   ├── routes/            # RESTful API 路由
│   ├── models/            # Mongoose 数据模型
│   ├── services/          # 业务逻辑（存储、成就）
│   ├── websocket/         # WebSocket 消息推送
│   └── scripts/           # 数据库备份脚本
├── frontend_source/       # Vue 3 前端源码
│   ├── src/views/         # 页面组件
│   ├── src/components/    # 公共组件
│   ├── src/stores/        # Pinia 状态管理
│   └── src/composables/   # 组合式函数
└── frontend/dist/         # 构建产物（由 CI/CD 或手动生成，勿提交）
```

---

## 🤝 参与贡献

欢迎 Issue 和 PR！

1. Fork 本仓库
2. 从 `develop` 分支创建你的功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

详细规范可参考 [`AGENTS.md`](./AGENTS.md)。

---

## 📄 License

本项目采用 [MIT](LICENSE) 协议开源。

> 如果你也喜欢这个项目，请给它一颗 ⭐️ 吧！
