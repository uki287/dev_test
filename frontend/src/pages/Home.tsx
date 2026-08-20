// ============================================================
// 文件功能：首页（Phase E 核心 + 2026-08-20 企业官网质感升级）
// 组成：BannerSlider（自动轮播+主题联动+圆点/箭头+入场动效）→
//       品牌介绍（理念+数字指标+核心优势卡）→ 精选产品（系列单选+系列标签）→
//       新闻动态（日期徽章+栏目标签）→ 预约 CTA（含真实联系方式）。
// 权威依据：实施方案 Phase E（首页）+ UI/UX 规范 + 用户「更像企业官网」需求。
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { getBanners, getCompanyInfo, getNews, getProducts, getSeries } from '../api'
import type { Banner, CompanyInfo, NewsItem, Product, Series } from '../api/types'
import { useSite } from '../store/site'
import Reveal from '../components/Reveal'

// ---------- Banner 轮播 ----------
function BannerSlider({ banners, interval }: { banners: Banner[]; interval: number }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback((i: number) => {
    if (!banners.length) return
    setIndex(((i % banners.length) + banners.length) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (paused || banners.length <= 1) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % banners.length), interval * 1000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [banners.length, interval, paused])

  if (!banners.length) return null
  const b = banners[index]

  return (
    <section
      className="relative h-[86vh] min-h-130 overflow-hidden"
      aria-label="品牌轮播"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* 背景图 + 双层遮罩（深左→透右，底部再叠一层渐变做文字衬底） */}
      <img src={b.image} alt={b.title || '轮播'} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(14,14,14,.78) 0%, rgba(14,14,14,.42) 52%, rgba(14,14,14,.06) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(14,14,14,.35) 100%)' }} />

      {/* 文案（左对齐 + 入场动效） */}
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-7xl px-6 w-full">
          <div key={index} className="max-w-2xl">
            {/* 金色 eyebrow 装饰线 */}
            <div className="flex items-center gap-3 mb-6 reveal reveal-visible">
              <span className="w-10 h-px bg-gold" />
              <span className="text-gold tracking-[0.3em] text-xs uppercase">TP Smart Home</span>
            </div>
            <h1 key={`t-${index}`} className="font-serif text-4xl md:text-6xl text-white mb-4 reveal reveal-visible" style={{ transitionDelay: '80ms' }}>
              {b.title || '智享未来家'}
            </h1>
            <p key={`s-${index}`} className="text-white/80 text-lg mb-8 max-w-md reveal reveal-visible" style={{ transitionDelay: '160ms' }}>
              全屋智能 · 高端家居解决方案
            </p>
            <div className="flex gap-4 reveal reveal-visible" style={{ transitionDelay: '240ms' }}>
              <Link
                to={b.link_url && b.link_url !== '/' ? b.link_url : '/products'}
                className="inline-block px-8 py-3 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 hover:shadow-gold transition-all"
              >
                探索产品
              </Link>
              <Link
                to="/about/company"
                className="inline-block px-8 py-3 rounded-md2 border border-white/40 text-white hover:border-gold hover:text-gold transition-colors"
              >
                品牌故事
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 滚动提示（仅首屏） */}
      <div className="absolute bottom-24 right-6 hidden md:flex flex-col items-center gap-2 text-white/50">
        <span className="text-xs tracking-widest rotate-90 origin-center translate-y-6">SCROLL</span>
        <span className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent" />
      </div>

      {/* 圆点指示器 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`第 ${i + 1} 张`}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-gold' : 'w-2 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>

      {/* 左右箭头 */}
      <button onClick={() => go(index - 1)} aria-label="上一张"
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/25 hover:scale-110 transition-all">
        <LeftOutlined />
      </button>
      <button onClick={() => go(index + 1)} aria-label="下一张"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/25 hover:scale-110 transition-all">
        <RightOutlined />
      </button>
    </section>
  )
}

// ---------- 精选产品卡（带系列标签） ----------
function ProductCard({ p, seriesName }: { p: Product; seriesName?: string }) {
  return (
    <Link to={`/products/${p.id}`} className="group block rounded-xl2 overflow-hidden bg-white shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="relative overflow-hidden">
        <img src={p.cover_image || ''} alt={p.name} loading="lazy"
          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
        {seriesName && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-ink/60 backdrop-blur text-white text-xs tracking-wide">
            {seriesName}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="font-serif text-lg text-ink mb-1 group-hover:text-gold transition-colors">{p.name}</div>
        <div className="text-sm text-gold">{p.price_desc || '价格面议'}</div>
      </div>
    </Link>
  )
}

// ---------- 首页主组件 ----------
export default function Home() {
  const navigate = useNavigate()
  const [banners, setBanners] = useState<Banner[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTotal, setProductTotal] = useState(0)
  const [news, setNews] = useState<NewsItem[]>([])
  const [company, setCompany] = useState<Record<string, string>>({})
  const [activeSeries, setActiveSeries] = useState<number | undefined>()
  const settings = useSite((s) => s.settings)

  useEffect(() => {
    getBanners().then(setBanners).catch(() => setBanners([]))
    getSeries().then(setSeries).catch(() => setSeries([]))
    getNews({ page: 1, page_size: 3 }).then((d) => setNews(d.items)).catch(() => setNews([]))
    getCompanyInfo()
      .then((rows: CompanyInfo[]) => {
        const map: Record<string, string> = {}
        rows.forEach((r) => { if (r.info_value) map[r.info_key] = r.info_value })
        setCompany(map)
      })
      .catch(() => setCompany({}))
  }, [])

  // 精选产品：系列切换
  useEffect(() => {
    getProducts({ page: 1, page_size: 8, series_id: activeSeries })
      .then((d) => { setProducts(d.items); setProductTotal(d.total) })
      .catch(() => { setProducts([]); setProductTotal(0) })
  }, [activeSeries])

  // 系列 id → 名称 映射（产品卡标签）
  const seriesNameMap = useMemo(() => {
    const m: Record<number, string> = {}
    series.forEach((s) => { m[s.id] = s.name })
    return m
  }, [series])

  const interval = settings?.slider_interval ?? 4

  // 品牌数字指标（数据来自真实接口：系列数/产品数）
  const stats = [
    { num: String(series.length || 0), label: '产品系列' },
    { num: '5', label: '智慧空间' },
    { num: String(productTotal || 0), label: '智能产品' },
    { num: '365', label: '全天候服务' },
  ]

  const features = [
    { title: '全屋互联', desc: 'Matter / 米家等主流生态，跨品牌设备自由联动，构建真正懂你的智能空间。', icon: '✦' },
    { title: '设计美学', desc: '克制的极简外观，暖金与墨黑相映，让智能设备成为空间里的点睛之笔。', icon: '❖' },
    { title: '稳定可靠', desc: '从核心芯片到云端链路层层打磨，离线可用、断网可控，守护每个日常。', icon: '⬢' },
    { title: '贴心服务', desc: '从方案设计到安装调试全程陪伴，7×24 在线响应，售后无忧。', icon: '♡' },
  ]

  return (
    <div>
      <BannerSlider banners={banners} interval={interval} />

      {/* 品牌介绍：理念 + 数字指标 + 优势卡 */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="w-10 h-px bg-gold" />
            <span className="text-gold tracking-[0.25em] text-xs uppercase">About TP</span>
            <span className="w-10 h-px bg-gold" />
          </div>
          <h2 className="font-serif text-3xl md:text-5xl text-ink mb-6">高端智能，回归生活</h2>
          <p className="text-ink-soft max-w-2xl mx-auto leading-loose">
            TP智能家居专注于全屋智能解决方案，以稳定的产品、克制的设计，
            让科技安静地融入每一个日常瞬间。从一盏灯到一整个家，
            我们用专业与温度，为您构筑可持续生长的智慧生活。
          </p>
          <Link to="/about/company" className="inline-block mt-8 text-gold border-b border-gold pb-1 hover:opacity-80 transition-opacity">
            了解更多 →
          </Link>
        </Reveal>

        {/* 数字指标条 */}
        <Reveal delay={120}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-20">
            {stats.map((s) => (
              <div key={s.label} className="text-center py-6 border-b-2 border-gold/20 hover:border-gold transition-colors">
                <div className="font-serif text-4xl text-gold mb-2">{s.num}</div>
                <div className="text-sm text-ink-soft tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 核心优势卡 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="h-full p-6 rounded-xl2 bg-white shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 mb-4 rounded-lg bg-gold/10 text-gold flex items-center justify-center text-lg">
                  {f.icon}
                </div>
                <div className="font-serif text-lg text-ink mb-2">{f.title}</div>
                <p className="text-sm text-ink-soft leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 精选产品（系列单选） */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-px bg-gold" />
                <span className="text-gold tracking-[0.25em] text-xs uppercase">Products</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-ink">精选产品</h2>
            </div>
            {/* 系列筛选 */}
            <div className="flex gap-2" role="tablist" aria-label="产品系列筛选">
              <button
                data-active={activeSeries === undefined}
                onClick={() => setActiveSeries(undefined)}
                className={`px-4 py-2 rounded-md2 text-sm transition-colors ${activeSeries === undefined ? 'bg-gold text-ink' : 'text-ink-soft hover:text-gold'}`}
              >
                全部
              </button>
              {series.map((s) => (
                <button
                  key={s.id}
                  data-active={activeSeries === s.id}
                  onClick={() => setActiveSeries(s.id)}
                  className={`px-4 py-2 rounded-md2 text-sm transition-colors ${activeSeries === s.id ? 'bg-gold text-ink' : 'text-ink-soft hover:text-gold'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard p={p} seriesName={seriesNameMap[p.series_id ?? -1]} />
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-12">
            <button onClick={() => navigate('/products')}
              className="px-8 py-3 rounded-md2 border border-gold text-gold hover:bg-gold hover:text-ink transition-colors">
              查看全部产品
            </button>
          </Reveal>
        </div>
      </section>

      {/* 新闻动态 */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-px bg-gold" />
              <span className="text-gold tracking-[0.25em] text-xs uppercase">News</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-ink">新闻动态</h2>
          </div>
          <Link to="/news/industry" className="text-gold text-sm hover:opacity-80">更多 →</Link>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {news.map((n, i) => (
            <Reveal key={n.id} delay={i * 90}>
              <Link to={`/news/${n.id}`} className="group block rounded-xl2 overflow-hidden bg-white shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="relative overflow-hidden">
                  {n.cover_image ? (
                    <img src={n.cover_image} alt={n.title} loading="lazy" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-ink to-ink-deep flex items-center justify-center">
                      <span className="font-serif text-white/30 text-2xl">{n.category === 'company' ? '企业动态' : '行业资讯'}</span>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-ink/60 backdrop-blur text-white text-xs">
                    {n.category === 'company' ? '企业动态' : '行业资讯'}
                  </span>
                </div>
                <div className="p-5">
                  <div className="font-medium text-ink group-hover:text-gold transition-colors line-clamp-2">{n.title}</div>
                  <div className="mt-2 text-sm text-ink-soft line-clamp-2">{n.summary}</div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-soft/60">
                    <span>{n.published_at ? String(n.published_at).slice(0, 10) : ''}</span>
                    <span className="text-gold group-hover:translate-x-1 transition-transform">阅读全文 →</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 预约 CTA（含真实联系方式） */}
      <section className="bg-ink py-24 text-center" style={{ background: '#0E0E0E' }}>
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 className="font-serif text-3xl md:text-4xl text-gold mb-4">开启您的全屋智能之旅</h2>
            <p className="text-white/60 mb-10">预约展厅参观或工厂考察，亲身体验智能生活</p>
            <Link
              to="/about/appointment"
              className="inline-block px-10 py-3.5 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 hover:shadow-gold transition-all"
            >
              立即预约
            </Link>
            {/* 联系方式 */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {company.phone && (
                <div className="text-center">
                  <div className="text-gold text-xs tracking-widest mb-2">服务热线</div>
                  <a href={`tel:${company.phone}`} className="text-white hover:text-gold transition-colors">{company.phone}</a>
                </div>
              )}
              {company.email && (
                <div className="text-center">
                  <div className="text-gold text-xs tracking-widest mb-2">商务合作</div>
                  <a href={`mailto:${company.email}`} className="text-white hover:text-gold transition-colors">{company.email}</a>
                </div>
              )}
              {company.address && (
                <div className="text-center">
                  <div className="text-gold text-xs tracking-widest mb-2">体验中心</div>
                  <div className="text-white">{company.address}</div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
