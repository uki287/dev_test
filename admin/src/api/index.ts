// ============================================================
// 文件功能：后台业务 API 聚合（Phase C 起直连真实后端）
// 说明：VITE_USE_MOCK=false 后全部走真实后端（联调期，方案 D3）。
//       覆盖认证/上传/轮播/系列/产品/新闻/招聘/关于/系统设置。
// 权威依据：实施方案 Phase C（后台内容管理）+ §7 字段对齐规则。
// ============================================================
import request from './request'
import type {
  AboutPage, AdminUser, AggItem, Appointment, AppointmentDetail, Banner, CompanyInfo,
  Job, LogItem, Message, MessageDetail, News, PageResult, PermNode, Product,
  PvPoint, Role, Series, Settings, StatsOverview, Timeline, TokenOut, TopPage, UserInfo,
} from './types'

// ---------- 认证 ----------
// 登录：账号密码（验证码功能已移除）
export const login = (username: string, password: string) =>
  request.post('/auth/login', { username, password }) as Promise<TokenOut>

// 当前用户信息（含权限码）
export const getMe = () => request.get('/auth/me') as Promise<UserInfo>

// 强制改密
export const resetPassword = (oldPassword: string, newPassword: string) =>
  request.post('/auth/reset-password', { old_password: oldPassword, new_password: newPassword })

// 登出（令牌拉黑）
export const logoutApi = () => request.post('/auth/logout')

// ---------- 上传 ----------
export const uploadFile = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return request.post('/admin/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{ url: string; filename: string }>
}

// ---------- 轮播图 ----------
export const getBanners = (params?: { page?: number; page_size?: number }) =>
  request.get('/admin/banners', { params }) as Promise<PageResult<Banner>>
export const createBanner = (data: Partial<Banner>) => request.post('/admin/banners', data)
export const updateBanner = (id: number, data: Partial<Banner>) => request.put(`/admin/banners/${id}`, data)
export const deleteBanner = (id: number) => request.delete(`/admin/banners/${id}`)

// ---------- 产品系列 ----------
export const getSeries = (params?: { page?: number; page_size?: number }) =>
  request.get('/admin/series', { params }) as Promise<PageResult<Series>>
export const createSeries = (data: Partial<Series>) => request.post('/admin/series', data)
export const updateSeries = (id: number, data: Partial<Series>) => request.put(`/admin/series/${id}`, data)
export const deleteSeries = (id: number) => request.delete(`/admin/series/${id}`)

// ---------- 产品 ----------
export const getProducts = (params?: { page?: number; page_size?: number; series_id?: number; pub_status?: string; keyword?: string }) =>
  request.get('/admin/products', { params }) as Promise<PageResult<Product>>
export const createProduct = (data: Partial<Product>) => request.post('/admin/products', data)
export const updateProduct = (id: number, data: Partial<Product>) => request.put(`/admin/products/${id}`, data)
export const deleteProduct = (id: number) => request.delete(`/admin/products/${id}`)
export const batchProductStatus = (ids: number[], pub_status: string) =>
  request.post('/admin/products/batch-status', { ids, pub_status })
export const duplicateProduct = (id: number) => request.post(`/admin/products/${id}/duplicate`)

// ---------- 新闻 ----------
export const getNews = (params?: { page?: number; page_size?: number; category?: string; pub_status?: string }) =>
  request.get('/admin/news', { params }) as Promise<PageResult<News>>
export const createNews = (data: Partial<News>) => request.post('/admin/news', data)
export const updateNews = (id: number, data: Partial<News>) => request.put(`/admin/news/${id}`, data)
export const deleteNews = (id: number) => request.delete(`/admin/news/${id}`)

// ---------- 招聘 ----------
export const getJobs = (params?: { page?: number; page_size?: number; category?: string }) =>
  request.get('/admin/jobs', { params }) as Promise<PageResult<Job>>
export const createJob = (data: Partial<Job>) => request.post('/admin/jobs', data)
export const updateJob = (id: number, data: Partial<Job>) => request.put(`/admin/jobs/${id}`, data)
export const deleteJob = (id: number) => request.delete(`/admin/jobs/${id}`)
export const duplicateJob = (id: number) => request.post(`/admin/jobs/${id}/duplicate`)

// ---------- 关于管理 ----------
export const getAboutPages = () => request.get('/admin/about/pages') as Promise<AboutPage[]>
export const updateAboutPage = (pageKey: string, content: Record<string, unknown>) =>
  request.put(`/admin/about/pages/${pageKey}`, { content })
export const getTimeline = (type?: string) =>
  request.get('/admin/about/timeline', { params: type ? { type } : {} }) as Promise<Timeline[]>
export const createTimeline = (data: Partial<Timeline>) => request.post('/admin/about/timeline', data)
export const updateTimeline = (id: number, data: Partial<Timeline>) => request.put(`/admin/about/timeline/${id}`, data)
export const deleteTimeline = (id: number) => request.delete(`/admin/about/timeline/${id}`)
export const getCompanyInfo = () => request.get('/admin/about/company') as Promise<CompanyInfo[]>
export const createCompanyInfo = (data: { info_key: string; info_value?: string; remark?: string }) =>
  request.post('/admin/about/company', data)
export const updateCompanyInfo = (id: number, data: { info_value?: string; remark?: string }) =>
  request.put(`/admin/about/company/${id}`, data)

// ---------- 系统设置 ----------
export const getSettings = () => request.get('/admin/settings') as Promise<Settings>
export const updateSettings = (data: Partial<Settings>) => request.put('/admin/settings', data)

// ---------- 工作台统计 ----------
export interface DashboardStats {
  appointment: number
  message: number
  product: number
  news: number
  pv7: { date: string; pv: number }[]
}
export const getDashboardStats = () => request.get('/admin/stats/dashboard') as Promise<DashboardStats>

// ============ Phase D：预约 / 留言 ============
export const getAppointments = (params?: { page?: number; page_size?: number; status?: string; appt_type?: string }) =>
  request.get('/admin/appointments', { params }) as Promise<PageResult<Appointment>>
export const getAppointmentDetail = (id: number) =>
  request.get(`/admin/appointments/${id}`) as Promise<AppointmentDetail>
export const updateAppointmentStatus = (id: number, data: { status: string; handle_remark?: string }) =>
  request.put(`/admin/appointments/${id}/status`, data)
export const batchAppointmentStatus = (ids: number[], status: string) =>
  request.post('/admin/appointments/batch-status', { ids, status })
export const deleteAppointment = (id: number) => request.delete(`/admin/appointments/${id}`)

export const getMessages = (params?: { page?: number; page_size?: number; status?: string }) =>
  request.get('/admin/messages', { params }) as Promise<PageResult<Message>>
export const getMessageDetail = (id: number) => request.get(`/admin/messages/${id}`) as Promise<MessageDetail>
export const updateMessageStatus = (id: number, data: { status: string; handle_remark?: string }) =>
  request.put(`/admin/messages/${id}/status`, data)
export const batchMessageStatus = (ids: number[], status: string) =>
  request.post('/admin/messages/batch-status', { ids, status })
export const deleteMessage = (id: number) => request.delete(`/admin/messages/${id}`)

// 导出 xlsx（blob 下载）
export const downloadBlob = async (url: string, filename: string) => {
  const blob = (await request.get(url, { responseType: 'blob' })) as unknown as Blob
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
export const exportAppointments = () => downloadBlob('/admin/appointments/export', '预约列表.xlsx')
export const exportMessages = () => downloadBlob('/admin/messages/export', '留言列表.xlsx')

// ============ Phase D：管理员 / 角色 ============
export const getUsers = (params?: { page?: number; page_size?: number; keyword?: string }) =>
  request.get('/admin/users', { params }) as Promise<PageResult<AdminUser>>
export const createUser = (data: { username: string; password: string; cn_name?: string; role_id?: number | null; is_activate?: number }) =>
  request.post('/admin/users', data)
export const updateUser = (id: number, data: { cn_name?: string; role_id?: number | null; is_activate?: number }) =>
  request.put(`/admin/users/${id}`, data)
export const resetUserPassword = (id: number, new_password: string) =>
  request.post(`/admin/users/${id}/reset-password`, { new_password })
export const deleteUser = (id: number) => request.delete(`/admin/users/${id}`)

export const getRoles = () => request.get('/admin/roles') as Promise<Role[]>
export const getPermTree = () => request.get('/admin/roles/perm-tree') as Promise<{ tree: PermNode[] }>
export const createRole = (data: { code: string; name: string; description?: string; perms: string[]; is_activate?: number }) =>
  request.post('/admin/roles', data)
export const updateRole = (id: number, data: { name?: string; description?: string; perms?: string[]; is_activate?: number }) =>
  request.put(`/admin/roles/${id}`, data)
export const deleteRole = (id: number) => request.delete(`/admin/roles/${id}`)

// ============ Phase D：操作日志 / 数据统计 ============
export const getLogs = (params?: { page?: number; page_size?: number; username?: string; module?: string }) =>
  request.get('/admin/logs', { params }) as Promise<PageResult<LogItem>>
export const getStatsOverview = () => request.get('/admin/stats/overview') as Promise<StatsOverview>
export const getPvTrend = (days = 30) => request.get('/admin/stats/pv-trend', { params: { days } }) as Promise<PvPoint[]>
export const getTopPages = (days = 7) => request.get('/admin/stats/top-pages', { params: { days } }) as Promise<TopPage[]>
export const getAggregate = (kind: 'appointment' | 'message', dimension: 'status' | 'type') =>
  request.get('/admin/stats/aggregate', { params: { kind, dimension } }) as Promise<AggItem[]>
export const exportStatsReport = () => downloadBlob('/admin/stats/export?days=30', '数据统计报表.xlsx')
