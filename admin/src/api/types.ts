// ============================================================
// 文件功能：后台业务类型定义（字段对齐后端 Out 模型与原型 STORE）
// 说明：Banner/Series/Product/News/Job/About/Company/Settings/UserInfo，
//       字段名与后端 Pydantic Out 完全一致（方案 §7 零漂移）。
// ============================================================

// ---------- 认证 ----------
export interface UserInfo {
  id: number
  username: string
  cn_name?: string | null
  role_code?: string | null
  role_name?: string | null
  perms: string[]
  force_pwd: boolean
}

export interface TokenOut {
  access_token: string
  token_type: string
  expires_in: number
  force_pwd: boolean
  user: UserInfo
}

// ---------- 轮播图 ----------
export interface Banner {
  id: number
  title?: string | null
  image: string
  link_url?: string | null
  start_at?: string | null
  end_at?: string | null
  sort: number
  is_activate: number
}

// ---------- 产品系列 ----------
export interface Series {
  id: number
  name: string
  cover_image?: string | null
  description?: string | null
  sort: number
  is_activate: number
}

// ---------- 产品 ----------
export interface Product {
  id: number
  category_id?: number | null
  series_id?: number | null
  product_code: string
  name: string
  description?: string | null
  spec?: Record<string, string> | null
  cover_image?: string | null
  images?: string[] | null
  pub_status: 'on_shelf' | 'off_shelf' | 'draft'
  is_top: boolean
  sort: number
  views: number
  related_products?: number[] | null
  price_desc?: string | null
}

// ---------- 新闻 ----------
export interface News {
  id: number
  category: 'industry' | 'company'
  title: string
  cover_image?: string | null
  images?: string[] | null
  summary?: string | null
  content?: string | null
  source?: string | null
  author?: string | null
  is_top: boolean
  sort: number
  views: number
  pub_status: 'draft' | 'published' | 'offline'
  published_at?: string | null
  expired_at?: string | null
}

// ---------- 招聘 ----------
export interface Job {
  id: number
  category: 'industry' | 'campus'
  title: string
  count?: number | null
  location?: string | null
  salary_desc?: string | null
  duty?: string | null
  requirement?: string | null
  email?: string | null
  sort: number
  is_activate: number
}

// ---------- 关于 ----------
export interface AboutPage {
  id: number
  page_key: string
  content?: Record<string, unknown> | null
}

export interface Timeline {
  id: number
  type: 'history' | 'brand_history'
  year: string
  title: string
  description?: string | null
  sort: number
}

export interface CompanyInfo {
  id: number
  info_key: string
  info_value?: string | null
  remark?: string | null
}

// ---------- 系统设置 ----------
export interface Settings {
  site_name?: string | null
  logo?: string | null
  icp?: string | null
  copyright?: string | null
  slider_interval: number
}

// ---------- 分页 ----------
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ---------- 预约 / 留言（Phase D） ----------
export interface Appointment {
  id: number
  name: string
  phone?: string | null      // 列表脱敏
  appt_type: string
  appt_date?: string | null
  appt_slot?: string | null
  remark?: string | null
  status: string
  source_page?: string | null
  created_date?: string | null
}
export interface AppointmentDetail extends Appointment {
  phone: string              // 详情明文
  handle_remark?: string | null
  handled_at?: string | null
}

export interface Message {
  id: number
  name: string
  phone?: string | null      // 列表脱敏
  type: string
  content: string
  product_id?: number | null
  status: string
  source_page?: string | null
  created_date?: string | null
}
export interface MessageDetail extends Message {
  phone: string              // 详情明文
  email?: string | null
  product_name?: string | null
  handle_remark?: string | null
  handled_at?: string | null
}

// ---------- 管理员 / 角色（Phase D） ----------
export interface AdminUser {
  id: number
  username: string
  cn_name?: string | null
  role_id?: number | null
  role_code?: string | null
  role_name?: string | null
  is_activate: number
  force_pwd?: number
}

export interface Role {
  id: number
  code: string
  name: string
  description?: string | null
  is_activate: number
  perms: string[]
}

export interface PermNode {
  id: number
  code: string
  name: string
  type: string
  children: PermNode[]
}

// ---------- 操作日志（Phase D） ----------
export interface LogItem {
  id: number
  username?: string | null
  module?: string | null
  action?: string | null
  detail?: string | null
  ip?: string | null
  created_date?: string | null
}

// ---------- 数据统计（Phase D） ----------
export interface StatsOverview {
  appointment: number
  message: number
  product: number
  news: number
  job: number
  today_appointment: number
  today_message: number
  today_pv: number
}
export interface PvPoint { date: string; pv: number }
export interface TopPage { path: string; pv: number }
export interface AggItem { key: string; count: number }
