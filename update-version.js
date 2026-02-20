#!/usr/bin/env node
/**
 * 自动递增版本号
 * 同时更新 version.json 和 config.js
 */

const fs = require('fs')
const path = require('path')

const rootDir = __dirname
const versionPath = path.join(rootDir, 'frontend_source', 'public', 'version.json')
const configPath = path.join(rootDir, 'frontend_source', 'src', 'utils', 'config.js')

// 读取当前版本
const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
const [major, minor, patch] = versionData.version.split('.').map(Number)

// 递增版本
const newVersion = `${major}.${minor}.${patch + 1}`
const buildTime = new Date().toISOString().split('T')[0]

// 更新 version.json
versionData.version = newVersion
versionData.buildTime = buildTime

// 添加新的 changelog 条目（如果手动添加了）
if (!versionData.changelog.find(log => log.version === newVersion)) {
  versionData.changelog.unshift({
    version: newVersion,
    date: buildTime,
    changes: ["常规更新优化"]
  })
}

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))

// 更新 config.js
let configContent = fs.readFileSync(configPath, 'utf-8')
configContent = configContent.replace(
  /VERSION: '[\d.]+'/,
  `VERSION: '${newVersion}'`
)
fs.writeFileSync(configPath, configContent)

console.log(`✅ 版本已更新: ${newVersion}`)
