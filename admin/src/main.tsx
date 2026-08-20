// ============================================================
// 文件功能：后台应用入口
// 说明：
//   - ConfigProvider 落地设计 token（主色暖金 #B98A2F、布局底米白 #FAF8F4）+ 中文语言包；
//   - RouterProvider 挂载路由表（登录/403/受保护主布局，Phase C 框架）。
// 权威依据：方案 §4.1 后台 UI（AntD 5）+ Phase C（登录页 + AuthGuard + 布局）。
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import 'antd/dist/reset.css' // AntD 5 样式重置（CSS-in-JS 前提下仍需 reset）

// AntD 主题 token：对齐品牌视觉（暖金主色 + 米白布局底）
const theme = {
  token: {
    colorPrimary: '#B98A2F', // 暖金主色（C-02 待确认沿用）
    borderRadius: 8,
    colorBgLayout: '#FAF8F4', // 布局底色（米白）
  },
}

// 渲染根：主题 + 中文 + 路由
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>,
)
