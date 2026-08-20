// ============================================================
// 文件功能：前台业务 API（Phase E 起直连真实后端公开接口）
// 说明：VITE_USE_MOCK=false 后全部走真实后端（联调期，方案 D3）。
// 覆盖：轮播/系列/产品/新闻/招聘/关于/联系方式/站点配置 + 预约/留言提交。
// 权威依据：实施方案 Phase E + §7 字段对齐规则。
// ============================================================
import request from './request'
import type {
  AboutPage, Banner, CompanyInfo, Job, NewsDetail, NewsItem, PageResult,
  Product, ProductDetail, Series, Settings, Timeline,
} from './types'

// ---------- 公开只读 ----------
export const getBanners = () => request.get('/banners') as Promise<Banner[]>

export const getSeries = () => request.get('/series') as Promise<Series[]>

export const getProducts = (params?: { page?: number; page_size?: number; series_id?: number }) =>
  request.get('/products', { params }) as Promise<PageResult<Product>>

export const getProductDetail = (id: number) => request.get(`/products/${id}`) as Promise<ProductDetail>

export const getNews = (params?: { category?: 'industry' | 'company'; page?: number; page_size?: number }) =>
  request.get('/news', { params }) as Promise<PageResult<NewsItem>>

export const getNewsDetail = (id: number) => request.get(`/news/${id}`) as Promise<NewsDetail>

export const getJobs = (params?: { category?: 'industry' | 'campus' }) =>
  request.get('/jobs', { params }) as Promise<Job[]>

export const getAboutPages = () => request.get('/about/pages') as Promise<AboutPage[]>

export const getTimeline = (type?: 'history' | 'brand_history') =>
  request.get('/about/timeline', { params: type ? { type } : {} }) as Promise<Timeline[]>

export const getCompanyInfo = () => request.get('/about/company') as Promise<CompanyInfo[]>

export const getSettings = () => request.get('/settings') as Promise<Settings>

// ---------- 公开提交（限流由后端处理） ----------
export const submitAppointment = (data: {
  name: string; phone: string; appt_type: 'showroom' | 'factory';
  appt_date?: string; appt_slot?: 'morning' | 'afternoon'; remark?: string;
}) => request.post('/appointments', data)

export const submitMessage = (data: {
  name: string; phone: string; email?: string;
  type: 'product' | 'cooperation' | 'aftersale' | 'other';
  content: string; product_id?: number; source_page?: string;
}) => request.post('/messages', data)
