// ============================================================
// 文件功能：前端 axios 实例与拦截器（真实后端通信通道）
// 说明：
//   - baseURL 取 VITE_API_BASE（默认 /api，经 Vite 代理到 :8000）；
//   - 请求拦截器：自动附加 JWT（Authorization 头）；
//   - 响应拦截器：解包统一结构 {code,message,data}（code=0 取 data）；
//     遇 401 清除 token 并跳登录页。
// 注：Mock 模式不在此处发起请求，由 api/index.ts 分流到本地 mock。
// 权威依据：方案 Phase A「前端 API 客户端封装」。
// ============================================================
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api', // 基础路径
  timeout: 10000, // 请求超时 10s
})

// 请求拦截：携带令牌
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token') // 从本地存储读取 JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}` // 附加 Bearer 令牌
  }
  return config
})

// 响应拦截：解包与 401 处理
request.interceptors.response.use(
  (res: AxiosResponse) => {
    const body = res.data
    // 后端统一结构：code=0 成功，直接返回 data；否则抛出 message
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data
      return Promise.reject(new Error(body.message || '业务错误'))
    }
    return body // 非标准结构原样返回
  },
  (err) => {
    // 401 未授权：清除登录态并跳转登录
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default request
