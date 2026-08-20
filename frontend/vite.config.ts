// ============================================================
// 文件功能：Vite 构建与开发服务器配置（前台官网）
// 说明：
//   - 端口 5173；
//   - 开发期将 /api 代理到 FastAPI 后端 :8000（方案 Phase A：Vite 代理）；
//   - 联调时前端走真实后端，Mock 期走本地 mock（由 VITE_USE_MOCK 控制）。
// 权威依据：方案 §4.2 / Phase A「Vite 代理」。
// ============================================================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 开发代理：前端请求 /api/* 转发到后端，避免跨域
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 上传图片静态目录代理（Phase E：前台展示后台上传的图片）
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
