# GitHub Actions 自动部署

## 配置步骤

### 1. 生成SSH密钥对
在本地终端运行：
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/aliyun_deploy -C "github-actions"
# 不要设置密码，直接回车
cat ~/.ssh/aliyun_deploy.pub
```

### 2. 添加公钥到服务器
将 `aliyun_deploy.pub` 的内容添加到服务器的 `/root/.ssh/authorized_keys`：
```bash
ssh root@你的服务器IP
echo "粘贴公钥内容" >> /root/.ssh/authorized_keys
```

### 3. 配置GitHub Secrets
在GitHub仓库 → Settings → Secrets and variables → Actions → New repository secret，添加以下 secrets：

| Name | Value | 说明 |
|------|-------|------|
| `ALIYUN_IP` | 你的服务器IP | 阿里云ECS公网IP |
| `ALIYUN_SSH_KEY` | 私钥内容 | `cat ~/.ssh/aliyun_deploy` 的全部内容 |
| `ALIYUN_HOST` | 你的服务器IP | 用于known_hosts |
| `ALIYUN_HOST_KEY` | 服务器host key | 运行 `ssh-keyscan 你的IP` 获取 |

### 4. 测试部署
每次推送到 main 分支，GitHub Actions 会自动：
1. 连接服务器
2. 拉取最新代码
3. 安装依赖
4. 重启服务

### 5. 查看部署状态
在GitHub仓库 → Actions 查看部署日志。

---

## 手动触发部署

如果需要在GitHub页面上手动部署：

修改 `.github/workflows/deploy.yml`，在 `on:` 部分添加：
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:  # 添加这行支持手动触发
```

然后在GitHub页面 → Actions → Deploy to Aliyun → Run workflow
