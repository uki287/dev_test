// ============================================================
// 文件功能：前台 Mock 数据层（复用原型 DEFAULT_STORE 字段名）
// 说明：
//   - 字段名严格对齐原型 STORE（方案 §7 接口字段对齐规则），
//     确保后续从 Mock 平滑迁移真实接口，零字段漂移；
//   - 仅放置 Phase A 验证所需的最小样例数据（占位，非真实素材）。
// 使用方式：api/index.ts 在 VITE_USE_MOCK=true 时直接返回此处数据。
// ============================================================

// ---------- 类型定义（对齐原型 STORE 字段） ----------
// 轮播图
export interface Banner {
  id: number
  title: string          // 主标题
  subtitle: string       // 副标题
  image_url: string      // 图片地址（占位）
  link_url: string       // 跳转链接（主题联动：/、/products?series=xxx）
  is_active: boolean     // 是否启用
}
// 产品系列
export interface Series {
  id: number
  name: string           // 系列名（如 智能照明）
  code: string           // 系列编码（lighting/security...）
  cover: string          // 封面
}
// 产品
export interface Product {
  id: number
  name: string
  series_id: number      // 所属系列
  product_code: string   // 产品编码
  price: string          // 价格（面议占位）
  cover: string
  pub_status: string     // published/draft
  is_top: boolean        // 是否首页推荐
}
// 新闻
export interface News {
  id: number
  title: string
  category: string       // industry/company
  cover: string
  pub_status: string
  is_top: boolean
}
// 招聘
export interface Job {
  id: number
  title: string
  type: string           // industry/campus
  location: string
  email: string          // 投递邮箱（mailto:）
}
// 站点设置
export interface SiteSettings {
  siteName: string
  sliderInterval: number // 轮播间隔（秒），默认 4，最小 3
  icp: string
  copyright: string
}

// ---------- 模拟数据（DEFAULT_STORE） ----------
export const DEFAULT_STORE = {
  // 轮播图：link_url 体现主题联动（首页/产品系列筛选）
  banners: [
    { id: 1, title: '智享未来家', subtitle: '全屋智能 · 一键掌控', image_url: 'https://picsum.photos/seed/tp1/1600/600', link_url: '/', is_active: true },
    { id: 2, title: '智能照明', subtitle: '光影随心', image_url: 'https://picsum.photos/seed/tp2/1600/600', link_url: '/products?series=lighting', is_active: true },
    { id: 3, title: '智能安防', subtitle: '守护每一刻', image_url: 'https://picsum.photos/seed/tp3/1600/600', link_url: '/products?series=security', is_active: true },
    { id: 4, title: '智能温控', subtitle: '冷暖自知', image_url: 'https://picsum.photos/seed/tp4/1600/600', link_url: '/products?series=climate', is_active: false },
  ] as Banner[],

  // 产品系列
  series: [
    { id: 1, name: '智能照明', code: 'lighting', cover: 'https://picsum.photos/seed/s1/400/300' },
    { id: 2, name: '智能安防', code: 'security', cover: 'https://picsum.photos/seed/s2/400/300' },
    { id: 3, name: '智能温控', code: 'climate', cover: 'https://picsum.photos/seed/s3/400/300' },
  ] as Series[],

  // 精选产品
  products: [
    { id: 1, name: '智能吸顶灯 Pro', series_id: 1, product_code: 'LIGHT-001', price: '面议', cover: 'https://picsum.photos/seed/p1/400/300', pub_status: 'published', is_top: true },
    { id: 2, name: '智能门锁 X1', series_id: 2, product_code: 'LOCK-001', price: '面议', cover: 'https://picsum.photos/seed/p2/400/300', pub_status: 'published', is_top: true },
    { id: 3, name: '温湿度传感器', series_id: 3, product_code: 'CLIM-001', price: '面议', cover: 'https://picsum.photos/seed/p3/400/300', pub_status: 'published', is_top: false },
    { id: 4, name: '智能筒灯', series_id: 1, product_code: 'LIGHT-002', price: '面议', cover: 'https://picsum.photos/seed/p4/400/300', pub_status: 'published', is_top: false },
  ] as Product[],

  // 新闻动态
  news: [
    { id: 1, title: 'TP智能家居亮相行业博览会', category: 'industry', cover: 'https://picsum.photos/seed/n1/400/300', pub_status: 'published', is_top: true },
    { id: 2, title: '公司荣获年度智能创新奖', category: 'company', cover: 'https://picsum.photos/seed/n2/400/300', pub_status: 'published', is_top: false },
  ] as News[],

  // 招聘
  jobs: [
    { id: 1, title: '嵌入式软件工程师', type: 'industry', location: '深圳', email: 'hr@tp-smart.home' },
    { id: 2, title: '校园招聘 · 管培生', type: 'campus', location: '全国', email: 'campus@tp-smart.home' },
  ] as Job[],

  // 站点设置
  settings: {
    siteName: 'TP智能家居',
    sliderInterval: 4,
    icp: '粤ICP备XXXXXXXX号',
    copyright: '© 2026 TP智能家居 版权所有',
  } as SiteSettings,
}
