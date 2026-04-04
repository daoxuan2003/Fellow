# 共赴 - 情侣专属私密空间

> 一个只有你们两个人的私密小世界。前端 Vue 3 PWA + 后端 Express + MongoDB，支持实时同步、推送通知、AI 助手和成就系统。

---

## 一、项目概述

**共赴**（内部代号 Fellow / lifesync-pwa）是一款面向情侣的私密共享应用。双方绑定后，可以在同一个空间里记录日常、互相提醒、共同成长。

核心设计理念：
- **双人绑定**：一切数据以 `coupleId` 为隔离单元，只有绑定双方可见
- **实时同步**：WebSocket 长连接，一方的操作另一方即时收到通知
- **PWA 体验**：可添加到手机桌面，离线缓存，接近原生 App 的使用感
- **AI 陪伴**：内置习惯计划 AI 助手，可分析、优化、生成打卡计划

---

## 二、技术栈

### 前端 `frontend_source/`
| 技术 | 说明 |
|------|------|
| Vue 3.5 | Composition API + `<script setup>` |
| Vue Router 4 | 前端路由，带 JWT 路由守卫 |
| Vite 5 | 构建工具，开发服务器端口 5173 |
| Pinia 3 | 状态管理（主要存储用户状态）|
| vant 4 | 移动端组件库（目前用于 DatePicker）|
| Cropper.js | 图片裁剪 |
| vite-plugin-pwa | Service Worker、manifest、离线缓存策略 |

### 后端 `backend/`
| 技术 | 说明 |
|------|------|
| Node.js + Express 4 | RESTful API |
| MongoDB + Mongoose 7 | 数据库 |
| WebSocket (`ws`) | 实时消息推送，端口 3001 |
| Web Push (`web-push`) | 浏览器推送通知（PWA 离线也能收到）|
| JWT (`jsonwebtoken`) | 用户鉴权 |
| bcryptjs | 密码加密 |
| multer | 本地文件上传中间件 |
| AWS SDK v3 | 兼容 S3 的对象存储（雨云/MinIO 等）|
| Axios | 后端 HTTP 请求（调用 Moonshot AI）|

---

## 三、功能模块

### 1. 首页 (`/home`)
- 展示情侣双方的昵称、头像、相爱天数
- 快捷入口导航到各个功能模块
- 实时接收 WebSocket 通知（如伴侣打卡、添加快递等）

### 2. 取件清单 (`/express`)
- 添加/编辑/删除快递代取任务
- 紧急任务置顶
- 标记已取（3 天内可撤销）
- 按月份归档已取快递
- 新增时自动推送给伴侣

### 3. 坚持计划 (`/plans`)
最复杂的核心模块，支持三种打卡类型：
- **简单打卡**：一键完成
- **子任务打卡**：可配置多个子任务，支持按周几分配不同任务
- **数值记录**：记录数值并生成趋势图（如体重、饮水量）

其他特性：
- 双人计划：可配置「仅自己」「仅对方」「两人一起」
- 请假系统：每月限请 2 次，单次最多 2 天
- 补卡/提前打卡：支持本周内提前或延后补录
- 周报：周日自动弹出本周打卡报告
- AI 助手：分析习惯数据、优化计划、生成新计划
- **成就系统**：24 个成就徽章，后端持久化，支持进度条和解锁动画

### 4. 心愿墙 (`/wish`)
- 双方可贴上心愿便利贴
- 支持优先级标记
- 目标日期设置

### 5. 共享相册 (`/album`)
- 上传照片，自动同步给对方
- 照片标签、日期、地点记录
- 内置美食日记（FoodDiary）和旅行护照（TravelPassport）组件
- 灯箱（Lightbox）浏览大图
- 图片裁剪上传

### 6. 我的 (`/profile`)
- 个人资料编辑（头像、昵称、生日、纪念日）
- 情侣绑定/解绑
- 通知权限管理（订阅/取消 Web Push）
- 版本更新日志
- 存储空间状态

---

## 四、项目结构

```
Fellow/
├── AGENTS.md              # 开发规范（分支策略、Git 提交规范、版本号规则）
├── DEPLOY.md              # 阿里云宝塔面板部署教程
├── ecosystem.config.js    # PM2 配置
├── backend/               # Node.js 后端
│   ├── server.js          # 入口：Express + WebSocket + MongoDB 连接
│   ├── config/            # 推送通知配置、AI 配置
│   ├── middleware/        # auth、errorHandler、upload
│   ├── models/            # Mongoose 模型（User/Habit/CheckIn/Achievement...）
│   ├── routes/            # API 路由（按模块拆分）
│   ├── services/          # 业务服务（storage、achievementService）
│   ├── utils/             # 工具函数、成就配置
│   ├── websocket/         # WebSocket 服务端实现
│   └── uploads/           # 本地上传目录（生产环境可切换 S3）
├── frontend_source/       # Vue 3 源码
│   ├── src/
│   │   ├── views/         # 页面级组件（Login/Home/Express/Plans/Profile/Album/Wish）
│   │   ├── components/    # 公共组件（BottomNav/AIDrawer/DatePickerField...）
│   │   ├── composables/   # 组合式函数（useWebSocket）
│   │   ├── stores/        # Pinia 状态（user.js）
│   │   ├── router/        # Vue Router 配置
│   │   ├── utils/         # 工具函数（config.js、notification.js、cache.js）
│   │   └── style.css      # 全局样式、CSS 变量
│   ├── public/            # 静态资源
│   └── vite.config.js     # Vite + PWA 配置
└── frontend/dist/         # 构建产物（由服务器自动构建，**不要提交到仓库**）
```

---

## 五、架构亮点

### 5.1 实时同步机制
- 前端建立 WebSocket 连接后先发 `auth` 消息携带 JWT
- 后端将 `userId -> ws` 映射存入内存
- 任何一方触发关键操作（打卡、添加快递、上传照片等），后端调用 `notifyPartner()` 推送消息
- 前端收到 `partnerUpdated` 后刷新对应模块数据

### 5.2 推送通知（PWA）
- 支持浏览器 Web Push（VAPID）
- 即使用户关闭了页面，也能收到「TA 完成了计划」「新快递待取」等通知
- 通知文案和跳转 URL 由 `config/notifications.js` 统一配置

### 5.3 存储策略
- 开发环境：本地磁盘存储（`backend/uploads/`）
- 生产环境：通过环境变量切换为 S3 兼容存储（如雨云对象存储）
- 头像有独立的 Workbox 缓存策略（StaleWhileRevalidate，缓存 1 年）

### 5.4 AI 集成
- 对接 Moonshot AI（Kimi）
- 支持流式对话（`/api/ai/stream-chat`）
- 习惯助手可基于真实打卡数据做分析和计划生成
- AI 生成计划后支持「应用到我的计划」或「替换原计划」

### 5.5 版本更新机制
- 前端通过 `version.json` 管理版本号和更新日志
- 生产环境下每 5 分钟检查一次版本变化
- 发现新版本后弹窗提示用户「立即更新」，强制清空 Service Worker 和缓存后刷新

---

## 六、开发环境启动

### 后端
```bash
cd backend
cp .env.example .env   # 配置 MongoDB URI、JWT Secret 等
npm install
npm run dev             # nodemon server.js，端口 3000
```

### 前端
```bash
cd frontend_source
npm install
npm run dev             # vite，端口 5173，代理 /api -> localhost:3000
```

> 前端开发时自动代理 `/api` 到 `localhost:3000`，WebSocket 直连 `localhost:3001`。

---

## 七、关键环境变量

```env
# 数据库
MONGODB_URI=mongodb://localhost:27017/fellow

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# WebSocket / 服务器
PORT=3000
WS_PORT=3001

# Web Push（VAPID）
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# 对象存储（可选，默认 local）
STORAGE_MODE=s3
S3_ENDPOINT=https://xxx
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET=xxx

# AI
MOONSHOT_API_KEY=sk-xxx
```

---

## 八、Git 工作流（必看）

详细规范见 `AGENTS.md`，核心要点：
- `main`：生产环境，只接受 `develop` 合并
- `develop`：开发环境，日常开发基分支
- 功能分支：`feature/xxx`、`fix/xxx`、`docs/xxx`
- **不要直接推送 `develop`**，需经过代码审查后合并
- tag 保留历史，不要删除

---

## 九、部署提示

- 生产环境使用 **Nginx 反向代理**：
  - `/api` → `localhost:3000`
  - `/ws` → `localhost:3001`（WebSocket）
  - 静态文件 → `frontend/dist`
- 使用 `pm2 start ecosystem.config.js` 守护 Node 进程
- 详细图文部署教程见 `DEPLOY.md`

---

## 十、给 AI / 新开发者的备注

1. **所有页面组件都在 `frontend_source/src/views/`，路由在 `router/index.js`**
2. **后端 API 前缀统一为 `/api/xxx`**，路由文件在 `backend/routes/`
3. **用户鉴权通过 `Authorization: Bearer <token>` 头部传递**，`req.userId` 由 `authMiddleware` 注入
4. **coupleId 生成规则**：`[userId, partnerId].sort().join('_')`**，这是全库数据隔离的核心键**
5. **成就系统已全部后端化**，前端不再读写 `localStorage` 中的成就数据
6. **日期格式统一用 `YYYY-MM-DD` 字符串**，避免 UTC 时差问题
7. **不要在本地执行 `npm run build`**，构建产物 `frontend/dist` 不应提交到 Git
