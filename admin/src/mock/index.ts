// ============================================================
// 文件功能：后台 Mock 数据层（复用原型 DEFAULT_STORE 字段名）
// 说明：
//   - 字段名对齐原型 STORE（方案 §7），含 users/roles/appointments/
//     messages/logs/banners/products/settings；
//   - 默认超管 admin / admin123（Phase B 种子将写入真实库）；
//   - 仅放置 Phase A 验证所需最小样例（占位）。
// 使用方式：api/index.ts 在 VITE_USE_MOCK=true 时直接返回此处数据。
// ============================================================

// 管理员
export interface User {
  id: number
  username: string
  password: string // 明文仅用于 Mock；真实后端存 bcrypt 哈希
  nickname: string
  role: string     // 角色编码（super_admin/content_editor/operator）
  is_active: boolean
}
// 角色（含权限码数组）
export interface Role {
  id: number
  name: string
  code: string
  perms: string[] // 权限码，如 banner:* / product:*
}
// 预约
export interface Appointment {
  id: number
  name: string
  phone: string
  type: string     // 产品预约/服务预约...
  status: string   // pending/confirmed/completed/cancelled
  created_at: string
}
// 留言
export interface Message {
  id: number
  name: string
  phone: string
  content: string
  type: string
  status: string
  created_at: string
}
// 操作日志
export interface Log {
  id: number
  user: string
  action: string
  module: string
  created_at: string
}
// 站点设置
export interface Setting {
  siteName: string
  sliderInterval: number
}

// ---------- 模拟数据（DEFAULT_STORE） ----------
export const DEFAULT_STORE = {
  // 管理员（默认超管，方案 Phase B 种子对应）
  users: [
    { id: 1, username: 'admin', password: 'admin123', nickname: '超级管理员', role: 'super_admin', is_active: true },
  ] as User[],

  // 角色（权限树，方案 §6 权限码）
  roles: [
    { id: 1, name: '超级管理员', code: 'super_admin', perms: ['*:*'] },
    { id: 2, name: '内容编辑', code: 'content_editor', perms: ['banner:*', 'series:*', 'product:*', 'news:*', 'job:*', 'about:*'] },
    { id: 3, name: '运营', code: 'operator', perms: ['appointment:view', 'appointment:handle', 'message:view', 'message:handle'] },
  ] as Role[],

  // 轮播图
  banners: [
    { id: 1, title: '智享未来家', subtitle: '全屋智能', image_url: 'https://picsum.photos/seed/tp1/1600/600', link_url: '/', is_active: true },
    { id: 2, title: '智能照明', subtitle: '光影随心', image_url: 'https://picsum.photos/seed/tp2/1600/600', link_url: '/products?series=lighting', is_active: true },
  ],

  // 产品
  products: [
    { id: 1, name: '智能吸顶灯 Pro', series_id: 1, product_code: 'LIGHT-001', price: '面议', cover: 'https://picsum.photos/seed/p1/400/300', pub_status: 'published', is_top: true },
    { id: 2, name: '智能门锁 X1', series_id: 2, product_code: 'LOCK-001', price: '面议', cover: 'https://picsum.photos/seed/p2/400/300', pub_status: 'published', is_top: true },
  ],

  // 预约（脱敏展示在列表，详情明文——方案 §6 隐私）
  appointments: [
    { id: 1, name: '张**', phone: '138****1234', type: '产品预约', status: 'pending', created_at: '2026-08-18 10:00' },
    { id: 2, name: '李**', phone: '139****5678', type: '服务预约', status: 'confirmed', created_at: '2026-08-18 14:30' },
  ] as Appointment[],

  // 留言
  messages: [
    { id: 1, name: '王**', phone: '137****0000', content: '咨询全屋智能方案', type: 'product', status: 'pending', created_at: '2026-08-18 09:20' },
  ] as Message[],

  // 操作日志（不存明文手机，方案 §6）
  logs: [
    { id: 1, user: 'admin', action: '登录', module: 'auth', created_at: '2026-08-18 08:50' },
    { id: 2, user: 'admin', action: '更新轮播图', module: 'banner', created_at: '2026-08-18 11:10' },
  ] as Log[],

  // 设置
  settings: {
    siteName: 'TP智能家居',
    sliderInterval: 4,
  } as Setting,
}
