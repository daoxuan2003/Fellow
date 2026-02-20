#!/usr/bin/env node
/**
 * 自动递增版本号
 * 1.0.0 -> 1.0.1 -> 1.0.2
 */

const fs = require('fs')
const path = require('path')

const versionPath = path.join(__dirname, 'frontend_source', 'public', 'version.json')
const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))

// 解析当前版本 1.0.0
const [major, minor, patch] = data.version.split('.').map(Number)

// 递增 patch 版本
const newVersion = `${major}.${minor}.${patch + 1}`
const buildTime = new Date().toISOString().split('T')[0]

data.version = newVersion
data.buildTime = buildTime

// 写入
fs.writeFileSync(versionPath, JSON.stringify(data, null, 2))

console.log(`✅ 版本已更新: ${data.version} -> ${newVersion}`)
