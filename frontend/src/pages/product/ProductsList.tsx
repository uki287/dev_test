// ============================================================
// 文件功能：产品列表页（Phase E）
// 功能：系列筛选（支持 URL ?series=xxx 主题联动预选）、卡片网格 3→2→1 列、
//       分页、排序（默认/最新/名称）。
// 权威依据：实施方案 Phase E（产品：系列筛选 + 卡片网格 + 分页 + 排序）。
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getProducts, getSeries } from '../../api'
import type { Product, Series } from '../../api/types'

export default function ProductsList() {
  const [searchParams] = useSearchParams()
  const initialSeries = searchParams.get('series')
  const [series, setSeries] = useState<Series[]>([])
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeSeries, setActiveSeries] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<'default' | 'latest' | 'name'>('default')
  const PAGE_SIZE = 9

  // 系列列表
  useEffect(() => {
    getSeries().then(setSeries).catch(() => setSeries([]))
  }, [])

  // URL 主题联动：/products?series=lighting → 匹配系列
  useEffect(() => {
    if (initialSeries && series.length) {
      const hit = series.find((s) => s.name.includes(initialSeries) || initialSeries.includes(s.name))
      if (hit) setActiveSeries(hit.id)
    }
  }, [initialSeries, series])

  // 产品列表（系列筛选 + 分页）
  useEffect(() => {
    getProducts({ page, page_size: PAGE_SIZE, series_id: activeSeries })
      .then((d) => { setItems(d.items); setTotal(d.total) })
      .catch(() => { setItems([]); setTotal(0) })
  }, [page, activeSeries])

  // 排序（本地）
  const sorted = useMemo(() => {
    const list = [...items]
    if (sort === 'latest') list.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    return list
  }, [items, sort])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* 页头 */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-ink mb-2">产品中心</h1>
        <p className="text-ink-soft">全屋智能 · 高端家居解决方案</p>
      </div>

      {/* 筛选 + 排序 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="系列筛选">
          <button
            data-active={activeSeries === undefined}
            onClick={() => { setActiveSeries(undefined); setPage(1) }}
            className={`px-4 py-2 rounded-md2 text-sm transition-colors ${activeSeries === undefined ? 'bg-gold text-ink' : 'text-ink-soft hover:text-gold'}`}
          >
            全部
          </button>
          {series.map((s) => (
            <button
              key={s.id}
              data-active={activeSeries === s.id}
              onClick={() => { setActiveSeries(s.id); setPage(1) }}
              className={`px-4 py-2 rounded-md2 text-sm transition-colors ${activeSeries === s.id ? 'bg-gold text-ink' : 'text-ink-soft hover:text-gold'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 rounded-md2 border border-line text-sm bg-white"
          aria-label="排序方式"
        >
          <option value="default">默认排序</option>
          <option value="latest">最新上架</option>
          <option value="name">按名称</option>
        </select>
      </div>

      {/* 产品卡片网格 3→2→1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="group block rounded-xl2 overflow-hidden bg-white shadow-card hover:shadow-lg transition-shadow">
            <div className="overflow-hidden">
              <img src={p.cover_image || ''} alt={p.name} loading="lazy"
                className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-5">
              <div className="font-serif text-xl text-ink mb-1 group-hover:text-gold transition-colors">{p.name}</div>
              <div className="text-xs text-ink-soft/60 mb-2">{p.product_code}</div>
              <div className="text-sm text-gold">{p.price_desc || '价格面议'}</div>
            </div>
          </Link>
        ))}
      </div>
      {sorted.length === 0 && <div className="text-center py-16 text-ink-soft">该系列暂无产品</div>}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors">上一页</button>
          <span className="px-4 py-2 text-sm text-ink-soft">第 {page} / {totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors">下一页</button>
        </div>
      )}
    </div>
  )
}
