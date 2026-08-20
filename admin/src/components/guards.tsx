// ============================================================
// 文件功能：路由守卫组件（AuthGuard / PermGuard）
// 说明：
//   - AuthGuard：无 token 跳 /login；有 token 但无用户信息则拉取 /me 补全；
//   - PermGuard：页面级权限码校验，无权限渲染 403（配合菜单隐藏双重保险，L-05）；
//   - 403 页为独立路由（无权限跳 403 的落点）。
// 权威依据：实施方案 Phase C（登录页 + AuthGuard + 无权限跳 403）。
// ============================================================
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../store/auth'
import * as api from '../api'

// 登录守卫：未登录重定向到 /login
export function AuthGuard() {
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  // 有 token 但用户信息缺失（如刷新页面）：拉取 /me 补全
  useEffect(() => {
    if (token && !user && !loading) {
      setLoading(true)
      api
        .getMe()
        .then(setUser)
        .catch(() => {
          // 令牌失效：清空并回登录页
          useAuth.getState().clear()
        })
        .finally(() => setLoading(false))
    }
  }, [token, user, loading, setUser])

  if (!token) return <Navigate to="/login" replace />
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载用户信息..." />
      </div>
    )
  }
  // 保留当前路径，登录后原路返回（带 state）
  return <Outlet />
}

// 页面权限守卫：无权限 → 403 页
export function PermGuard({ code }: { code: string }) {
  const hasPerm = useAuth((s) => s.hasPerm)
  const location = useLocation()
  if (!hasPerm(code)) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
