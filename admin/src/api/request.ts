// ============================================================
// 文件功能：后台 axios 实例与拦截器（真实后端通信通道）
// 说明：与前台一致——附加 JWT、解包 {code,message,data}、401 跳登录。
//       登录页路径为 /login。Mock 模式由 api/index.ts 分流。
// 权威依据：方案 Phase A「前端 API 客户端封装」（前后台同源封装）。
// ============================================================
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api', // 基础路径
  timeout: 10000,
})

// 请求拦截：携带令牌
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token') // 读取 JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}` // 附加 Bearer 令牌
  }
  return config
})

// 响应拦截：解包与 401 处理
request.interceptors.response.use(
  (res: AxiosResponse) => {
    const body = res.data
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data // 成功取 data
      return Promise.reject(new Error(body.message || '业务错误'))
    }
    return body
  },
  (err) => {
    // 优先透出后端业务 message（如 40300 启用数校验提示）
    const body = err.response?.data
    const msg = body?.message || body?.detail || err.message || '请求失败'
    // 401 未授权：清除登录态并跳转登录页
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  },
)

export default request
