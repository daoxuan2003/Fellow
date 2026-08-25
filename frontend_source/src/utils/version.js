// 版本管理 - 统一从 version.json 读取
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('Version')

export const VERSION_CACHE_KEY = 'app_version'
export const LATEST_VERSION_CACHE_KEY = 'app_latest_version_cache'
export const CHANGELOG_CACHE_KEY = 'app_changelog'
export const FALLBACK_VERSION = '9.0.1'
export const FALLBACK_CHANGELOG = [
  {
    version: '9.0.1',
    date: '2026-08-25',
    changes: [
      '🐛 修复 MongoDB 不支持多文档事务时录入欠款返回 503 的问题',
      '🔁 欠款初始化支持幂等重试和失败补偿，避免重复账户、重复计划或重复广播',
      '🛡️ 还款与普通流水继续要求数据库事务，不降低资金变更安全边界',
      '✍️ 将“剩余费用”改为“额外手续费/利息”，并说明账单已包含时填写 0'
    ]
  },
  {
    version: '9.0.0',
    date: '2026-08-25',
    changes: [
      '🧹 移除旧月预算、自定义预算分类、额度和手工净资产快照体系',
      '💳 账户、流水、欠款、资金分仓和还款记录统一成为钱包唯一数据来源',
      '🔒 流水接口迁入钱包并继续执行情侣范围、本人可改和账户所有权校验',
      '🛡️ 发布前备份失败即停止，清理迁移只删除固定三个旧集合且可安全重试',
      '🏠 首页钱包状态改为展示本人真实的安心可用金额'
    ]
  },
  {
    version: '8.5.0',
    date: '2026-08-25',
    changes: [
      '✨ 将记账升级为钱包，以安心可用、最近还款和上岸进度作为首页核心',
      '🧾 支持花呗、白条等欠款自动生成本地日历分期，并可调整未还期次',
      '🧩 新增还债、生活、出行、恋爱约会和自由使用五类资金分仓与未来现金流',
      '🤝 双方可查看完整钱包，同时坚持本人资金边界，支持用自己的资产账户替伴侣还款',
      '🛡️ 还款采用幂等原子入账，资产、负债、分期和流水同步更新并提供明确反馈'
    ]
  },
  {
    version: '8.4.2',
    date: '2026-08-21',
    changes: [
      '🐛 修复考研每日任务批量添加时 updatedAt 路径冲突导致的保存失败',
      '🔁 保留同一批次重试的幂等创建、首次写入时间和一次通知语义'
    ]
  },
  {
    version: '8.4.1',
    date: '2026-08-21',
    changes: [
      '🪟 今日任务输入改为点击打开弹框，主页面更清爽并继续支持一次添加多项',
      '🔔 新任务批次首次写入后即时提醒伴侣“今日任务已送达”，重试不会重复推送',
      '✅ 伴侣首次完成任务后通知真实创建者具体完成事项，撤销与无效操作不发送提醒',
      '📱 优化弹框焦点、加载、失败保留草稿和 320px 小屏安全区体验'
    ]
  },
  {
    version: '8.4.0',
    date: '2026-08-20',
    changes: [
      '📋 考研页新增置顶今日任务清单，支持每行一项、一次添加多条真实任务',
      '🤝 任务创建者负责列计划，仅当前伴侣可以打卡或纠正，完成后即时划线并反馈',
      '🗓️ 任务按上海日历日自动滚动，昨天标签只读保留前一日真实结果',
      '💌 根据昨天实际完成量生成分级激励，无任务或零完成时不虚报成就'
    ]
  },
  {
    version: '8.3.0',
    date: '2026-08-20',
    changes: [
      '📚 考研计划改为六条真实单位进度条，准确展示四科一轮复习落点与剩余量',
      '✅ 支持选择常用数量或自定义数量，一次登记或修正多个章节、讲次、视频和考点',
      '🎉 每次保存都有百分比变化与成就反馈，达到 100% 时显示明确完成状态并同步给伴侣',
      '🛡️ 进度按当前情侣关系原子写入并保护上下限，旧计划与历史打卡继续兼容'
    ]
  },
  {
    version: '8.2.1',
    date: '2026-08-01',
    changes: [
      '🎁 取件礼盒角标改为本月已取快递数，并包含当天已取件',
      '🗓️ 归档礼盒支持直接选择月份与更新、更早相邻切换，不再依赖漫长滚动',
      '🏅 每月展示一起收好、互相跑腿、取件日和紧急救援等真实共同成就',
      '📱 礼盒一次只展示一个月，长清单独立滚动并适配 320、375、430 宽度'
    ]
  },
  {
    version: '8.2.0',
    date: '2026-08-01',
    changes: [
      '💬 心情首页改为最近对话预览，完整心情、轻回应和短留言集中到按日对话页',
      '📦 快递卡片明确区分我的与伴侣的快递、紧急与普通，并只显示当前列表有件的地点',
      '🎁 当天已取件保留给实际取件人撤销，跨天记录自动收进右上角按月整理的情侣取件礼盒',
      '📱 优化窄屏对话与快递弹窗层级，礼盒和添加表单不再被底部导航遮挡'
    ]
  },
  {
    version: '8.1.3',
    date: '2026-07-31',
    changes: [
      '🐛 修复 iPhone PWA 冷启动和首次进入首页时根布局高度偏小、底部露出灰色区域的问题',
      '📱 底部导航恢复为固定贴底布局，安全区由底部内边距吸收，不再依赖首次视口测量',
      '🎨 统一 PWA 启动背景、浏览器主题与应用首帧纸张色，避免启动阶段出现颜色接缝'
    ]
  },
  {
    version: '8.1.2',
    date: '2026-07-31',
    changes: [
      '🐛 修复心情记录因空伴侣回应触发 ValidationError、导致所有心情无法保存的问题',
      '📱 修复手机重进应用时底部导航未及时贴合可视区域、切换标签后才恢复的问题',
      '🧭 底栏在回到前台、旋转和视口变化后分阶段重新对齐，并完整覆盖底部安全区'
    ]
  },
  {
    version: '8.1.1',
    date: '2026-07-31',
    changes: [
      '🐛 重排登录与注册页面，修复手机重进应用时底部导航安全区出现空白的问题',
      '💬 心情改为双方共享的对话流，任意一方发布后都可以继续轻回应和短留言',
      '🎨 十二种心情使用各自可辨认的角色表情，并保留首页双人头像与自然心情入口'
    ]
  },
  {
    version: '8.1.0',
    date: '2026-07-31',
    changes: [
      '🎨 首页恢复双人头像并自然融入心情状态，全站改为统一的首页、相册、心情、我的四项底部导航',
      '💌 心情升级为自有角色、伴侣轻回应和短留言，相册与各功能页统一内容优先的硬描边视觉',
      '📦 快递新增共享取件地点筛选与管理，支持粘贴通知自动识别取件码，并以事务保证地点改名和包裹同步更新',
      '📱 优化移动端弹窗、空状态和新增入口，覆盖 320、375、430 宽度且不引入虚构数据'
    ]
  },
  {
    version: '8.0.0',
    date: '2026-07-28',
    changes: [
      '🎨 按目标站完整重制首页、登录、个人页、共享导航与九个功能详情页的视觉系统',
      '🔌 心情、相册、考研、计划、健康、快递、保质期、账本和心愿继续接入原有真实数据、鉴权与实时刷新',
      '📱 补齐 320/375/430 宽度适配、加载、空、错误、长内容与安全区状态，不引入演示数据'
    ]
  },
  {
    version: '7.0.12',
    date: '2026-07-17',
    changes: [
      '🥚 首页合照中的双方心情入口改用与心情页一致的真实蛋角色；无记录时显示中性蛋形，不伪造“平静”',
      '💬 对方留言气泡改为位于我方气泡正下方的同侧轨道，长内容最多两行，保护合照文案与心情按钮不被遮挡'
    ]
  },
  {
    version: '7.0.11',
    date: '2026-07-16',
    changes: [
      '🫧 心情首页在没有真实记录时显示明确空状态，不再默认渲染“平静”情绪',
      '💬 今天的心情变化展示每条真实留言，并放大成员、情绪、留言和时间的可读字号',
      '✂️ 移除心情页“只属于我们的心情”副标题'
    ]
  },
  {
    version: '7.0.10',
    date: '2026-07-16',
    changes: [
      '🎨 十二个心情角色直接按参考图裁切并透明化，统一蛋体大小、表情、心形和涂鸦细节',
      '📐 复核心情首页、月历、选择、写下与单日轨迹的移动端尺寸、位置和安全区间距',
      '👫 心情页伴侣称呼按性别显示“她”或“他”，删除多余的“查看这个月的心情痕迹”入口',
      '🧭 修复独立心情流程页底部按钮居中，选择、写下和轨迹页继续不显示底部导航'
    ]
  },
  {
    version: '7.0.9',
    date: '2026-07-15',
    changes: [
      '🎨 按参考图重做心情首页、月历、情绪选择、写下心情与单日轨迹五个状态',
      '🫧 接入 12 个统一软陶情绪角色，移除旧 emoji 与仪式卡',
      '🕒 心情记录由服务端校验并持久化所选上海时间，补记与时间线按真实记录时间排序',
      '🔄 心情写入后实时同步给伴侣，独立流程页不显示底部导航'
    ]
  },
  {
    version: '7.0.8',
    date: '2026-07-15',
    changes: [
      '🐛 修复雨云 Rains3 私有相册图片的预签名下载地址返回 403（Forbidden）',
      '🔐 雨云端点自动使用官方要求的 rainyun 签名区域，不再受旧 cn-north-1 环境变量影响',
      '🛡️ 继续保持相册文件私有访问，不开启存储桶公共读取权限'
    ]
  },
  {
    version: '7.0.7',
    date: '2026-07-15',
    changes: [
      '🐛 清理服务器遗留的 couple-backend PM2 应用，修复两个后端进程反复争抢 3000/3001 端口',
      '🛡️ 部署强制校验只存在一个 couple-app-backend，并等待稳定运行 10 秒后再检查 API 与 WebSocket',
      '🎨 修复首页没有本人留言时“给她/他留一句话”继承通用按钮大字号的问题，与对方留言统一为 10.5px',
      '✅ 通过 140 项前端测试、197 项后端测试、远端 Vite 构建、依赖安全审计与 Impeccable 扫描'
    ]
  },
  {
    version: '7.0.6',
    date: '2026-07-15',
    changes: [
      '🐛 修复 PM2 热重载时新旧进程同时占用 WebSocket 3001 端口导致 EADDRINUSE 的问题',
      '🚀 生产后端改为无重叠重启，确保 7.0.5 的留言与照片接口真正加载到运行进程',
      '🛡️ 部署新增提交 SHA、PM2 在线状态与 WebSocket 握手校验，旧进程存活不再造成健康检查假通过',
      '✅ 通过 140 项前端测试、197 项后端测试、远端 Vite 构建与依赖安全审计'
    ]
  },
  {
    version: '7.0.5',
    date: '2026-07-15',
    changes: [
      '🐛 修复生产部署遗漏后端子目录，照片记录不再因新旧接口错位返回 400 和“照片URL不能为空”',
      '🖼️ 相册发布同时兼容滚动发布期间的新旧照片接口，并使用本地预览读取图片比例',
      '💬 首页留言在认证后端写入数据库成功后，再由服务器实时同步给伴侣，客户端不能伪造资料广播',
      '🎨 “给她/他留一句话”与对方留言使用完全一致的字号、字重和聊天气泡排版',
      '💞 我的页改用与首页相同的 250×42 双人爱心曲线并禁止拉伸变形',
      '📱 首页和全部功能页共用固定 81px 底部导航，清理我的页叠加的底部滚动空白',
      '✅ 通过 140 项前端测试、197 项后端测试、远端 Vite 构建、依赖安全审计与 Impeccable 扫描'
    ]
  },
  {
    version: '7.0.4',
    date: '2026-07-15',
    changes: [
      '🎨 首页按参考图重构为 430×932 高保真单画布，移除“去年今天”并放大九张小事卡片',
      '🧩 书本、快递、化妆品、回形针与图钉换成独立透明材质素材，九张卡片不再使用通用图标和统一边框',
      '💞 双人连线重绘为红蓝两条半心曲线，在首页、登录页、我的页和关于弹窗统一使用',
      '🔌 首页继续读取相册、留言、心情、计划、考研、健康、快递、化妆品、账本与心愿真实数据和空状态',
      '🎨 登录、注册与我的页统一青春配色、纸张材质、性别称谓和底部导航',
      '✅ 通过 136 项前端测试、三页移动端截图、空状态与留言弹窗审查及 Impeccable 扫描'
    ]
  },
  {
    version: '7.0.3',
    date: '2026-07-15',
    changes: [
      '📱 首页增加状态栏安全区，单屏会随不同手机尺寸完整缩放且不再遮挡顶部内容',
      '💬 首页留言改为独立弹窗，双方消息统一使用带方向尾巴的聊天气泡',
      '👫 根据伴侣性别显示他或她，未知性别使用对方；我的页展示昵称、性别与伴侣备注',
      '💞 红蓝连线重构为可复用的连续闭合爱心，并同步到首页、登录页与我的页',
      '🎨 登录页和我的页同步青春配色，小事卡片改用统一线性图标并优化内部排版',
      '✍️ 手写字体换为更清楚的自托管马善政楷体',
      '✅ 通过 133 项前端测试、Vue 编译、移动端截图与 Impeccable 扫描'
    ]
  },
  {
    version: '7.0.2',
    date: '2026-07-14',
    changes: [
      '🎨 首页由米黄棕灰纸感调整为亮珊瑚、清蓝、薄荷与浅柠檬组成的青春清透配色',
      '💞 头像连线不再叠放两个完整爱心，改为从参考图像素轨迹拟合的红蓝开放曲线与共享心形',
      '✍️ 合照文案和心愿墙接入自托管中文手写字体，跨手机保持明确的自然笔迹效果',
      '📝 心愿预览稳定排成两行并保留真实后端内容，过长标题使用省略号诚实截断',
      '🔎 通过 Impeccable 独立字体审查、机械扫描、Vue 编译和 133 项前端测试'
    ]
  },
  {
    version: '7.0.1',
    date: '2026-07-14',
    changes: [
      '🎨 首页、登录页与“我们”页按暖白纸感参考图统一重制，并保留原有功能入口',
      '🧹 首页彻底删除第二屏、旧分页结构与遗留轮播，只保留可随手机尺寸整体缩放的单屏画布',
      '💞 头像连线爱心按双方性别分别使用橙、蓝或中性色，一起生活天数改为重点信息',
      '🖼️ 合照与去年今天加入真实空白方案，首页手写文案按日期轮换且不再伪造照片内容',
      '💬 新增可编辑并实时同步的首页小留言，优化心情未记录时的友好表达',
      '🔌 九个生活小事窗口全部读取真实接口数据或展示明确空状态，移除示例账单、日期和心愿',
      '🫀 按参考图重绘双色心电图，并通过 Impeccable 字体、布局与反模式审查'
    ]
  },
  {
    version: '7.0.0',
    date: '2026-07-14',
    changes: [
      '🎨 首页按暖色纸感参考图重制为关系封面、共同照片、去年今天与生活小事拼贴',
      '📱 使用 430×932 单画布等比缩放，标准屏与窄屏保持同一构图且完整收进一页',
      '🧹 删除旧版首页第二屏、左右翻页控件与分页状态，首页只保留单屏画布',
      '🖼️ 首页合照与纪念缩略图直接使用情侣相册数据，无照片时保留双人关系占位',
      '🧭 保留心情、相册、考研、计划、健康、快递、化妆品、账本与心愿入口和实时状态',
      '✨ 底部导航改为今天、一起、记录、我们四项轻量线性视觉',
      '💞 头像连线改为橙蓝双色交叠爱心，并按参考图调整轮廓、角度与汇合位置'
    ]
  }
]

let cachedVersion = null
let cachedChangelog = null

function getStorage() {
  try {
    return globalThis.localStorage || null
  } catch (e) {
    return null
  }
}

function readStoredVersion() {
  const storage = getStorage()
  if (!storage) return ''
  return storage.getItem(LATEST_VERSION_CACHE_KEY) || storage.getItem(VERSION_CACHE_KEY) || ''
}

function readCurrentVersion() {
  const storage = getStorage()
  if (!storage) return ''
  return storage.getItem(VERSION_CACHE_KEY) || ''
}

function readStoredChangelog() {
  const storage = getStorage()
  if (!storage) return null

  try {
    const stored = JSON.parse(storage.getItem(CHANGELOG_CACHE_KEY) || 'null')
    return Array.isArray(stored) && stored.length > 0 ? stored : null
  } catch (e) {
    return null
  }
}

function writeVersionCache(data) {
  if (!data || typeof data.version !== 'string') return

  cachedVersion = data.version
  cachedChangelog = Array.isArray(data.changelog) ? data.changelog : cachedChangelog

  const storage = getStorage()
  if (!storage) return

  storage.setItem(LATEST_VERSION_CACHE_KEY, data.version)
  if (Array.isArray(data.changelog)) {
    storage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(data.changelog))
  }
}

async function fetchVersionData() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store'
  })

  if (!res.ok) {
    throw new Error(`version.json ${res.status}`)
  }

  const data = await res.json()
  if (!data || typeof data.version !== 'string') {
    throw new Error('version.json 格式无效')
  }

  writeVersionCache(data)
  return data
}

/**
 * 获取当前版本号
 * 优先从 version.json 读取，失败则使用缓存和当前内置版本
 */
export async function getVersion() {
  if (cachedVersion) return cachedVersion
  
  try {
    const data = await fetchVersionData()
    return data.version
  } catch (e) {
    logger.warn('获取版本失败', e)
  }
  
  // 降级顺序：内存缓存 -> 本地缓存 -> 当前内置版本
  const storedVersion = readStoredVersion()
  if (storedVersion) {
    cachedVersion = storedVersion
    return storedVersion
  }

  return FALLBACK_VERSION
}

/**
 * 获取版本更新日志
 */
export async function getChangelog() {
  if (cachedChangelog) return cachedChangelog
  
  try {
    const data = await fetchVersionData()
    return Array.isArray(data.changelog) ? data.changelog : FALLBACK_CHANGELOG
  } catch (e) {
    logger.warn('获取日志失败', e)
  }
  
  const storedChangelog = readStoredChangelog()
  if (storedChangelog) {
    cachedChangelog = storedChangelog
    return storedChangelog
  }

  return FALLBACK_CHANGELOG
}

/**
 * 同步获取版本（用于非异步场景，返回缓存值或默认值）
 */
export function getVersionSync() {
  return cachedVersion || readStoredVersion() || FALLBACK_VERSION
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string}>}
 */
export async function checkUpdate() {
  const latestVersion = await getVersion()
  // 从本地存储获取当前已确认运行版本，避免最新版本缓存掩盖更新提示
  const currentVersion = readCurrentVersion() || latestVersion
  
  return {
    hasUpdate: latestVersion !== currentVersion,
    currentVersion,
    latestVersion
  }
}

export function resetVersionCacheForTests() {
  cachedVersion = null
  cachedChangelog = null
}
