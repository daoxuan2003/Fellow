#!/usr/bin/env node
/**
 * 自动更新版本号
 * 每次构建前运行：node update-version.js
 */

const fs = require('fs')
const path = require('path')

// 生成时间戳版本号：20250219.143022
const now = new Date()
const version = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

const buildTime = now.toISOString().split('T')[0]

const versionData = {
  version,
  buildTime,
  changelog: process.argv[2] || '常规更新'
}

// 写入 version.json
const versionPath = path.join(__dirname, 'frontend_source', 'public', 'version.json')
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))

console.log(`✅ 版本已更新: ${version}`)

// 同时更新 main.js 中的版本号
const mainPath = path.join(__dirname, 'frontend_source', 'src', 'main.js')
let mainContent = fs.readFileSync(mainPath, 'utf-8')
mainContent = mainContent.replace(/const APP_VERSION = '[^']+'/, `const APP_VERSION = '${version}'`)
fs.writeFileSync(mainPath, mainContent)

console.log(`✅ main.js 版本号已同步`)
