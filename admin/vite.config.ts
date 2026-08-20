// ============================================================
// 文件功能：Vite 构建与开发服务器配置（后台管理系统）
// 说明：
//   - 端口 5174（与前台 5173 区分）；
//   - /api 代理到 FastAPI 后端 :8000（方案 Phase A：Vite 代理）。
// 权威依据：方案 §4.2 / Phase A「Vite 代理」。
// ============================================================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 上传图片静态目录代理（Phase C：后台预览上传图片）
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
