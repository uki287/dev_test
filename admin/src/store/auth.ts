// ============================================================
// 文件功能：认证状态 Store（zustand + localStorage 持久化）
// 说明：token / 用户信息 / 权限码集合全局共享；登录/登出动作封装。
//       perms 供菜单按权限码过滤（L-05）与页面级权限判断。
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '../api/types'
import * as api from '../api'

interface AuthState {
  token: string
  user: UserInfo | null
  setToken: (token: string) => void
  setUser: (user: UserInfo) => void
  clear: () => void
  hasPerm: (code: string) => boolean
}

// 权限匹配：精确 / 通配 xxx:* / 万能 *:*
export const matchPerm = (perms: string[], code: string): boolean =>
  perms.some((p) => p === code || p === '*:*' || (p.endsWith(':*') && code.startsWith(p.slice(0, -1))))

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: '',
      user: null,
      // 同步写入 localStorage['token']，与 axios 请求拦截器（request.ts）共用同一键
      setToken: (token) => {
        localStorage.setItem('token', token)
        set({ token })
      },
      setUser: (user) => set({ user }),
      clear: () => {
        localStorage.removeItem('token')
        set({ token: '', user: null })
      },
      // 页面/按钮级权限判断（与后端 require_perm 同规则）
      hasPerm: (code) => (get().user ? matchPerm(get().user!.perms, code) : false),
    }),
    { name: 'tp-admin-auth' }, // localStorage 键名（zustand 持久化）
  ),
)

// 便捷登出：调用后端拉黑 + 清空本地态
export async function doLogout() {
  try {
    await api.logoutApi()
  } catch {
    /* 忽略登出接口异常，本地态照常清空 */
  }
  useAuth.getState().clear()
  window.location.href = '/login'
}
