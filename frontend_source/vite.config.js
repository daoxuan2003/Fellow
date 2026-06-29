import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 显式禁用插件的 manifest 生成功能
      // public/manifest.json 会被 Vite 自动复制到 dist 目录（原封不动）
      manifest: false,
      
      // Service Worker 文件名
      filename: 'sw.js',
      
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      workbox: {
        importScripts: ['/sw-custom.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|html|ico|png|svg|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\//i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // 头像图片专用缓存 - 使用 StaleWhileRevalidate 策略
            // 优先使用缓存，同时后台更新
            urlPattern: /\/avatars\//i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'avatar-workbox-cache',
              expiration: { 
                maxEntries: 50, 
                maxAgeSeconds: 60 * 60 * 24 * 365 // 头像缓存1年
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // 上传文件缓存（包括头像）
            urlPattern: /\/uploads\//i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'uploads-cache',
              expiration: { 
                maxEntries: 100, 
                maxAgeSeconds: 60 * 60 * 24 * 30 
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    outDir: '../frontend/dist',
    cssMinify: true,
    emptyOutDir: true  // 构建前清空输出目录
  },
  server: {
    host: true, // 等价于命令行的 --host，暴露到局域网
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true }
    }
  }
})
