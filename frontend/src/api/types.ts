// ============================================================
// 文件功能：前台业务类型定义（字段对齐后端公开接口，方案 §7 零漂移）
// ============================================================

export interface Banner {
  id: number
  title?: string | null
  image: string
  link_url?: string | null
  sort: number
}

export interface Series {
  id: number
  name: string
  cover_image?: string | null
  description?: string | null
  sort: number
}

export interface Product {
  id: number
  product_code: string
  name: string
  description?: string | null
  spec?: Record<string, string> | null
  cover_image?: string | null
  images?: string[] | null
  is_top: boolean
  price_desc?: string | null
  related_products?: number[] | null
  views?: number
  series_id?: number | null
}

export interface RelatedProduct {
  id: number
  name: string
  cover_image?: string | null
  product_code: string
}

export interface ProductDetail extends Product {
  related: RelatedProduct[]
}

export interface NewsItem {
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
  views: number
  published_at?: string | null
}

export interface NewsDetail extends NewsItem {
  prev?: { id: number; title: string } | null
  next?: { id: number; title: string } | null
}

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
}

export interface AboutPage {
  page_key: string
  content?: { title?: string; blocks?: { h?: string; p?: string }[] } | null
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
  info_key: string
  info_value?: string | null
  remark?: string | null
}

export interface Settings {
  site_name?: string | null
  logo?: string | null
  icp?: string | null
  copyright?: string | null
  slider_interval: number
  baidu_map_ak?: string | null
  map_image?: string | null
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
