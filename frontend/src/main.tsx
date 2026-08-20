// ============================================================
// 文件功能：前台应用入口
// 说明：挂载 Router（Phase E 路由表），引入全局样式（Tailwind）。
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './styles/index.css' // 引入全局样式（Tailwind 指令）

// 将 Router 渲染进 #root 容器；StrictMode 仅开发期做额外检查
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
