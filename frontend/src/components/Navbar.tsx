// ============================================================
// 文件功能：前台全局导航（fixed 首屏压图 → 滚动实底 + 单例下拉 + 移动端抽屉）
// 说明：
//   - 滚动 >40px 后背景变 bg-ink/95 实底，文字浅色（方案 Phase E 全局框架）；
//   - 菜单 hover 金色下划线 250ms 过渡；下拉单例（G-02：一次只开一个）；
//   - <768 汉堡 → 抽屉 + 遮罩（MobileDrawer）。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { MenuOutlined, CloseOutlined, DownOutlined, UserOutlined } from '@ant-design/icons'
import { useSite } from '../store/site'

// 下拉菜单定义
const DROPDOWNS: Record<string, { label: string; path: string }[]> = {
  products: [
    { label: '全部产品', path: '/products' },
  ],
  news: [
    { label: '行业资讯', path: '/news/industry' },
    { label: '企业动态', path: '/news/company' },
  ],
  jobs: [
    { label: '社会招聘', path: '/jobs/industry' },
    { label: '校园招聘', path: '/jobs/campus' },
  ],
  about: [
    { label: '关于我们', path: '/about/company' },
    { label: '发展历程', path: '/about/history' },
    { label: '品牌历程', path: '/about/brand-history' },
    { label: '品牌介绍', path: '/about/brand' },
    { label: '在线预约', path: '/about/appointment' },
  ],
}

const TOP_LINKS = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'products', label: '产品', path: '/products', dropdown: true },
  { key: 'news', label: '新闻', path: '/news/industry', dropdown: true },
  { key: 'jobs', label: '招聘', path: '/jobs/industry', dropdown: true },
  { key: 'about', label: '关于', path: '/about/company', dropdown: true },
  { key: 'contact', label: '联系', path: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null) // 单例下拉
  const [drawerOpen, setDrawerOpen] = useState(false)
  const settings = useSite((s) => s.settings)
  const location = useLocation()

  // 滚动监听：>40px 变实底
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 路由变化时关闭所有弹层
  useEffect(() => {
    setOpenMenu(null)
    setDrawerOpen(false)
  }, [location.pathname])

  // Navbar 三态：
  //   - atTop 且未滚动：半透明深底（让菜单在亮色 hero 上也清晰可读）
  //   - scrolled 后：加深到 0.95 + 更强 blur（增强分离度）
  //   - drawerOpen 时：始终最深档（移动端抽屉打开时）
  const solidMax = scrolled || drawerOpen
  const navBg = solidMax ? 'rgba(14,14,14,0.95)' : 'rgba(14,14,14,0.85)'
  const navBlur = solidMax ? 'blur(16px)' : 'blur(12px)'
  const textClass = 'text-white hover:text-gold' // 所有状态下统一白字 + 金色 hover

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{
        background: navBg,
        backdropFilter: navBlur,
        WebkitBackdropFilter: navBlur,
        boxShadow: solidMax ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* 品牌 */}
        <Link to="/" className="font-serif text-2xl text-gold tracking-wide">
          {settings?.site_name || 'TP智能家居'}
        </Link>

        {/* 桌面菜单（≥768） */}
        <nav className="hidden md:flex items-center gap-1" aria-label="主导航">
          {TOP_LINKS.map((item) => (
            <div key={item.key} className="relative" onMouseEnter={() => setOpenMenu(item.key)} onMouseLeave={() => setOpenMenu(null)}>
              {item.dropdown ? (
                <button
                  className={`px-4 py-2 flex items-center gap-1 text-sm transition-colors duration-250 ${textClass}`}
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.key}
                >
                  {item.label}
                  <DownOutlined style={{ fontSize: 10 }} />
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  className={`px-4 py-2 text-sm transition-colors ${textClass}`}
                >
                  {item.label}
                </NavLink>
              )}
              {/* 金色下划线 */}
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100" style={{ transformOrigin: 'left', transition: 'transform 250ms' }} />

              {/* 单例下拉 */}
              {item.dropdown && openMenu === item.key && (
                <div className="absolute top-full left-0 pt-2 min-w-40">
                  <div className="bg-white rounded-lg shadow-xl py-2" style={{ boxShadow: '0 12px 32px rgba(0,0,0,.12)' }}>
                    {DROPDOWNS[item.key].map((d) => (
                      <Link
                        key={d.path}
                        to={d.path}
                        className="block px-4 py-2.5 text-sm text-ink hover:bg-cream hover:text-gold transition-colors"
                      >
                        {d.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 移动端汉堡（<768） */}
        <div className="flex items-center gap-3">
          {/* 登录入口（新标签打开后台登录页） */}
          <a
            href="http://localhost:5174/login"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-white/90 hover:text-gold text-sm transition-colors"
            aria-label="登录后台管理"
            title="登录后台管理"
          >
            <UserOutlined style={{ fontSize: 16 }} />
            <span className="hidden sm:inline">登录</span>
          </a>
          <button
            className="md:hidden text-white p-2"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <CloseOutlined style={{ fontSize: 22 }} /> : <MenuOutlined style={{ fontSize: 22 }} />}
          </button>
        </div>
      </div>

      {/* 移动端抽屉 + 遮罩 */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-ink/95 z-40">
          <nav className="px-6 py-6 space-y-1" aria-label="移动端导航">
            {TOP_LINKS.map((item) => (
              <div key={item.key}>
                <Link
                  to={item.path}
                  className="block py-3 text-white border-b border-white/10 hover:text-gold"
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </Link>
                {item.dropdown &&
                  DROPDOWNS[item.key].slice(1).map((d) => (
                    <Link
                      key={d.path}
                      to={d.path}
                      className="block py-2 pl-5 text-sm text-white/60 hover:text-gold"
                      onClick={() => setDrawerOpen(false)}
                    >
                      {d.label}
                    </Link>
                  ))}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
