// ============================================================
// 文件功能：后台路由表（React Router 6 嵌套路由）
// 说明：
//   - /login、/403 独立无布局；其余路径经 AuthGuard（登录守卫）；
//   - 主布局下按模块拆分，内容类页面套 PermGuard（无权限跳 403，L-05）；
//   - 各页面为占位组件，后续子任务（C-3~C-7）逐个替换为真实页面。
// 权威依据：实施方案 Phase C（登录页 + AuthGuard + 无权限跳 403）。
// ============================================================
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard, PermGuard } from './components/guards'
import BasicLayout from './layouts/BasicLayout'
import Login from './pages/Login'
import Forbidden from './pages/Forbidden'
import Dashboard from './pages/Dashboard'
import BannerList from './pages/banner/BannerList'
import SeriesList from './pages/product/SeriesList'
import ProductList from './pages/product/ProductList'
import NewsList from './pages/news/NewsList'
import JobList from './pages/job/JobList'
import AboutManage from './pages/about/AboutManage'
import SettingsPage from './pages/settings/SettingsPage'
import AppointmentList from './pages/business/AppointmentList'
import MessageList from './pages/business/MessageList'
import AdminUserList from './pages/system/AdminUserList'
import RoleList from './pages/system/RoleList'
import LogList from './pages/system/LogList'
import StatsPage from './pages/system/StatsPage'

export const router = createBrowserRouter([
  // 登录页（独立布局）
  { path: '/login', element: <Login /> },
  // 403 无权限页（独立布局）
  { path: '/403', element: <Forbidden /> },

  // 登录守卫包裹的受保护区域
  {
    element: <AuthGuard />,
    children: [
      {
        element: <BasicLayout />,
        children: [
          // 工作台（登录即可见）
          { path: '/dashboard', element: <Dashboard /> },

          // 内容管理模块：均按权限码过滤
          {
            element: <PermGuard code="banner:list" />,
            children: [{ path: '/banners', element: <BannerList /> }],
          },
          {
            element: <PermGuard code="series:list" />,
            children: [{ path: '/series', element: <SeriesList /> }],
          },
          {
            element: <PermGuard code="product:list" />,
            children: [{ path: '/products', element: <ProductList /> }],
          },
          {
            element: <PermGuard code="news:list" />,
            children: [{ path: '/news', element: <NewsList /> }],
          },
          {
            element: <PermGuard code="job:list" />,
            children: [{ path: '/jobs', element: <JobList /> }],
          },
          {
            element: <PermGuard code="about:list" />,
            children: [{ path: '/about', element: <AboutManage /> }],
          },
          // Phase D：业务 + 系统管理
          {
            element: <PermGuard code="appointment:view" />,
            children: [{ path: '/appointments', element: <AppointmentList /> }],
          },
          {
            element: <PermGuard code="message:view" />,
            children: [{ path: '/messages', element: <MessageList /> }],
          },
          {
            element: <PermGuard code="user:list" />,
            children: [{ path: '/users', element: <AdminUserList /> }],
          },
          {
            element: <PermGuard code="role:list" />,
            children: [{ path: '/roles', element: <RoleList /> }],
          },
          {
            element: <PermGuard code="log:view" />,
            children: [{ path: '/logs', element: <LogList /> }],
          },
          {
            element: <PermGuard code="stat:view" />,
            children: [{ path: '/stats', element: <StatsPage /> }],
          },
          {
            element: <PermGuard code="setting:list" />,
            children: [{ path: '/settings', element: <SettingsPage /> }],
          },
        ],
      },
    ],
  },

  // 兜底：未知路径回工作台
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
