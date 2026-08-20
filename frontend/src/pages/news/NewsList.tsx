// ============================================================
// 文件功能：新闻列表页（行业资讯 / 企业动态，Phase E）
// 功能：栏目由路由参数决定（/news/industry、/news/company），
//       置顶优先 + 分页，卡片 3→2→1 列。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getNews } from '../../api'
import type { NewsItem } from '../../api/types'

const CAT: Record<string, { label: string; desc: string }> = {
  industry: { label: '行业资讯', desc: '洞察智能家居行业趋势' },
  company: { label: '企业动态', desc: 'TP智能家居最新动态' },
}

export default function NewsList() {
  // 路由为静态路径（/news/industry、/news/company），无动态段，
  // 故从 pathname 解析分类，避免 useParams 恒为空导致切换失效
  const { pathname } = useLocation()
  const category: 'industry' | 'company' = pathname.startsWith('/news/company') ? 'company' : 'industry'
  const [items, setItems] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // 每页 10 条：第 1 条作大图横卡，余 9 条排 3 列网格（3 行整齐）
  const PAGE_SIZE = 10

  useEffect(() => {
    setPage(1)
  }, [category])

  useEffect(() => {
    getNews({ category: category as 'industry' | 'company', page, page_size: PAGE_SIZE })
      .then((d) => { setItems(d.items); setTotal(d.total) })
      .catch(() => { setItems([]); setTotal(0) })
  }, [category, page])

  const meta = CAT[category] ?? CAT.industry
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 无图占位：深色渐变 + 金色品牌字（比灰底文字更有质感）
  const CoverPlaceholder = () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 60%, #B98A2F 160%)' }}
    >
      <span className="font-serif text-xl md:text-2xl text-gold/70 tracking-widest">TP 智能家居</span>
    </div>
  )

  const fmtDate = (s?: string | null) => (s ? String(s).slice(0, 10) : '')

  // 首条新闻：大图横贯卡片（md+ 左图右文）
  const hero = items[0]
  const rest = items.slice(1)

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl text-ink mb-2">{meta.label}</h1>
        <p className="text-ink-soft">{meta.desc}</p>
      </div>

      {/* 首条大图横卡 */}
      {hero && (
        <Link
          to={`/news/${hero.id}`}
          className="group block rounded-xl2 overflow-hidden bg-white shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 mb-8 md:grid md:grid-cols-5"
        >
          <div className="md:col-span-3 h-64 md:h-96 overflow-hidden">
            {hero.cover_image ? (
              <img src={hero.cover_image} alt={hero.title} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <CoverPlaceholder />
            )}
          </div>
          <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs px-2.5 py-1 rounded-md2 bg-gold/15 text-gold font-medium">
                {hero.category === 'industry' ? '行业资讯' : '企业动态'}
              </span>
              <span className="text-xs text-ink-soft/60">{fmtDate(hero.published_at)}</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink leading-snug group-hover:text-gold transition-colors">
              {hero.is_top ? '⭐ ' : ''}{hero.title}
            </h2>
            {hero.summary && <p className="mt-4 text-ink-soft leading-relaxed line-clamp-3">{hero.summary}</p>}
            <span className="mt-8 inline-flex items-center gap-1 text-gold font-medium">
              阅读全文
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </div>
        </Link>
      )}

      {/* 其余网格卡 */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`}
              className="group block rounded-xl2 overflow-hidden bg-white shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              <div className="h-44 overflow-hidden">
                {n.cover_image ? (
                  <img src={n.cover_image} alt={n.title} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <CoverPlaceholder />
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {n.is_top && <span className="text-xs px-2 py-0.5 rounded bg-gold/15 text-gold">置顶</span>}
                  <span className="text-xs text-ink-soft/60">{fmtDate(n.published_at)}</span>
                </div>
                <div className="font-serif text-lg text-ink leading-snug group-hover:text-gold transition-colors line-clamp-2">{n.title}</div>
                {n.summary && <div className="mt-2 text-sm text-ink-soft line-clamp-2 flex-1">{n.summary}</div>}
                <div className="mt-4 text-gold text-sm flex items-center gap-1">
                  阅读全文
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {items.length === 0 && <div className="text-center py-16 text-ink-soft">暂无新闻</div>}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-5 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors">上一页</button>
          <span className="px-4 py-2 text-sm text-ink-soft">第 {page} / {totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-5 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors">下一页</button>
        </div>
      )}
    </div>
  )
}
