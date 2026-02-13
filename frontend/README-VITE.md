# Vite PWA 版本使用说明

## 已完成的改造

### 1. 项目结构
```
frontend/
├── index.html          # Vite 入口
├── vite.config.js      # Vite + PWA 配置
├── package.json        # 依赖管理
├── public/             # 静态资源
│   ├── heart.svg
│   └── icons/          # PWA 图标
└── src/
    ├── main.js         # Vue 入口
    ├── App.vue         # 根组件
    ├── style.css       # 全局样式
    ├── router/index.js # Vue Router
    ├── utils/config.js # API 配置
    ├── components/
    │   └── BottomNav.vue
    └── views/
        ├── Login.vue   # 登录/注册
        ├── Home.vue    # 首页
        └── Profile.vue # 个人资料
```

### 2. 性能优化
- ✅ 代码分割（vendor chunk 分离）
- ✅ Terser 压缩
- ✅ CSS 压缩
- ✅ 懒加载路由
- ✅ Service Worker 缓存
- ✅ 离线访问支持

### 3. PWA 特性
- ✅ 添加到主屏幕（iOS/Android）
- ✅ 离线缓存 API 数据
- ✅ 后台自动更新
- ✅ 沉浸式全屏体验

## 使用方法

### 开发
```bash
cd frontend
npm install
npm run dev
```

### 生产构建
```bash
npm run build
```

构建后的文件在 `dist/` 目录，直接部署到服务器即可。

## 与原版的区别

| 特性 | 原版 HTML | Vite PWA 版 |
|------|-----------|-------------|
| 页面切换 | 整页刷新 | 路由切换（丝滑） |
| 代码组织 | 单文件 | 组件化 |
| 缓存策略 | 无 | Service Worker |
| 离线使用 | 不支持 | 支持 |
| 安装到桌面 | 不支持 | 支持 |
| 打包大小 | 未优化 | Tree-shaking |

## iOS 安装到主屏幕

1. 用 Safari 打开网站
2. 点击分享按钮
3. 选择"添加到主屏幕"
4. 像原生 App 一样使用