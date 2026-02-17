import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          // 1. 静态资源 - 长期缓存（1年）
          {
            urlPattern: /\.(?:js|css|html|ico|png|svg|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: { 
                maxEntries: 200, 
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 2. 头像图片 - 长期缓存（30天），但可通过代码清除
          {
            urlPattern: /avatar/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-cache',
              expiration: { 
                maxEntries: 50, 
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 3. API 数据 - 网络优先（确保数据最新）
          {
            urlPattern: /\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3 // 网络超时3秒后使用缓存
            }
          },
          // 4. 其他图片资源 - 长期缓存
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { 
                maxEntries: 100, 
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
              }
            }
          }
        ]
      },
      manifest: {
        name: '共赴 - 情侣空间',
        short_name: '共赴',
        description: '专属于两个人的私密空间',
        theme_color: '#0F0F0F',
        background_color: '#0F0F0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { 
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%230A0A0F' width='192' height='192' rx='40'/%3E%3Cpath d='M96 160c-40-35-60-55-60-80a40 40 0 0 1 60-35 40 40 0 0 1 60 35c0 25-20 45-60 80z' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FF6B6B'/%3E%3Cstop offset='100%25' stop-color='%23FF8E8E'/%3E%3C/defs%3E%3C/svg%3E", 
            sizes: '192x192', 
            type: 'image/svg+xml' 
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true }
    }
  }
})