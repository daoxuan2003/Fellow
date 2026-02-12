# 我们俩 - 情侣私密网站

这是一个专为情侣设计的私密小网站，只有绑定了情侣关系的两个人才能看到彼此的内容。

## 功能特点

- ✅ 用户注册/登录
- ✅ 情侣互相绑定（通过配对码）
- ✅ 记录在一起的天数
- ✅ 简约温柔的粉色系设计
- ✅ 手机端 PWA 支持（可以添加到手机桌面）

## 技术栈

| 部分 | 技术 |
|------|------|
| 前端 | Vue 3 + 原生 CSS |
| 后端 | Node.js + Express |
| 数据库 | MongoDB |

---

## 运行步骤（新手教程）

### 第一步：安装必要软件

需要在你的电脑上安装以下三个软件：

1. **Node.js**（运行后端代码）
   - 官网：https://nodejs.org/
   - 下载 LTS 版本（长期支持版）
   - 安装时一直点"下一步"即可

2. **MongoDB**（数据库）
   - 官网：https://www.mongodb.com/try/download/community
   - 下载 Community Server（社区版）
   - 安装教程：https://www.mongodb.com/docs/manual/installation/
   - Mac 用户推荐用 Homebrew 安装：`brew tap mongodb/brew && brew install mongodb-community`

3. **VS Code**（代码编辑器，可选）
   - 官网：https://code.visualstudio.com/
   - 用来查看和修改代码

### 第二步：启动数据库

1. 打开终端（Mac 是 Terminal，Windows 是 CMD 或 PowerShell）

2. 启动 MongoDB：
   ```bash
   # Mac
   brew services start mongodb-community
   
   # Windows（如果安装时选择了作为服务运行，则自动启动）
   # 或者手动运行：
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
   ```

3. 看到 `waiting for connections on port 27017` 表示启动成功

### 第三步：启动后端服务器

1. 打开终端，进入后端文件夹：
   ```bash
   cd 情侣网站/backend
   ```

2. 安装依赖包（第一次运行时需要）：
   ```bash
   npm install
   ```
   这会下载 express、mongoose 等必要的包

3. 启动服务器：
   ```bash
   npm start
   ```
   或者开发模式（修改代码自动重启）：
   ```bash
   npm run dev
   ```

4. 看到 `服务器启动成功！访问地址：http://localhost:3000` 表示成功

### 第四步：打开网页

1. 直接双击打开 `frontend/index.html`，或者用 VS Code 的 Live Server 插件

2. 推荐方式：用 VS Code 打开项目，安装 "Live Server" 插件，右键 index.html 选择 "Open with Live Server"

3. 在手机端测试：
   - 确保手机和电脑在同一个 WiFi 下
   - 找到电脑的局域网 IP（在终端输入 `ipconfig` 或 `ifconfig`）
   - 手机浏览器访问：`http://电脑IP:5500/frontend/index.html`

### 第五步：注册并使用

1. 点击"注册"，填写昵称、账号、密码
2. 注册成功后会显示你的配对码
3. 让另一半也注册，然后互相输入对方的配对码
4. 绑定成功后首页会显示在一起的天数

---

## 项目结构

```
情侣网站/
├── backend/              # 后端代码
│   ├── server.js         # 服务器主文件
│   └── package.json      # 项目配置
├── frontend/             # 前端代码
│   ├── index.html        # 登录注册页
│   ├── home.html         # 首页
│   └── manifest.json     # PWA配置
└── README.md             # 本说明文档
```

---

## 常见问题

### 1. 提示 "数据库连接失败"
- 检查 MongoDB 是否已启动
- 检查 MongoDB 是否安装在默认端口 27017

### 2. 提示 "网络错误"
- 检查后端服务器是否已启动
- 检查前端代码里的 `apiUrl` 是否正确（默认是 `http://localhost:3000/api`）

### 3. 手机上打不开
- 确保手机和电脑在同一 WiFi
- 关闭电脑防火墙试试
- 使用 `http` 而不是 `https`

---

## 后续可添加的功能

- 📅 纪念日提醒
- 📝 情侣日记
- 📸 共享相册
- 🎯 愿望清单
- 💬 私密聊天

---

## 代码说明

### 后端代码注释说明

`backend/server.js` 中的每一行都有详细的中文注释，包括：
- 每个模块是做什么的
- 每个 API 接口的功能
- 数据库操作的逻辑

### 前端代码注释说明

`frontend/index.html` 和 `frontend/home.html` 中的注释包括：
- Vue 3 的基础用法
- 数据绑定和事件处理
- 页面生命周期
- API 请求的发送

---

祝你使用愉快！有问题可以查看代码注释，或者请教懂技术的朋友 💕
