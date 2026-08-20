// ============================================================
// 文件功能：前台路由表（React Router 6，Phase E 全量页面）
// ============================================================
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProductsList from './pages/product/ProductsList'
import ProductDetail from './pages/product/ProductDetail'
import NewsList from './pages/news/NewsList'
import NewsDetail from './pages/news/NewsDetail'
import JobsList from './pages/jobs/JobsList'
import JobDetail from './pages/jobs/JobDetail'
import { ContentSub, TimelineSub } from './pages/about/AboutSub'
import Appointment from './pages/about/Appointment'
import Contact from './pages/contact/Contact'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },

      // 产品
      { path: '/products', element: <ProductsList /> },
      { path: '/products/:id', element: <ProductDetail /> },

      // 新闻
      { path: '/news/industry', element: <NewsList /> },
      { path: '/news/company', element: <NewsList /> },
      { path: '/news/:id', element: <NewsDetail /> },

      // 招聘
      { path: '/jobs/industry', element: <JobsList /> },
      { path: '/jobs/campus', element: <JobsList /> },
      { path: '/jobs/:id', element: <JobDetail /> },

      // 关于（D1：company_intro 即"关于我们"）
      { path: '/about/company', element: <ContentSub pageKey="company_intro" fallbackTitle="关于我们" /> },
      { path: '/about/history', element: <TimelineSub type="history" fallbackTitle="发展历程" /> },
      { path: '/about/brand-history', element: <TimelineSub type="brand_history" fallbackTitle="品牌历程" /> },
      { path: '/about/brand', element: <ContentSub pageKey="brand_intro" fallbackTitle="品牌介绍" /> },
      { path: '/about/appointment', element: <Appointment /> },

      // 联系我们
      { path: '/contact', element: <Contact /> },

      { path: '*', element: <NotFound /> },
    ],
  },
])
