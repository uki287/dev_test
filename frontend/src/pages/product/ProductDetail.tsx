// ============================================================
// 文件功能：产品详情页（Phase E + 2026-08-20 布局调整）
// 功能：左侧=图廊（多图+灯箱）+ 产品描述（富文本，图廊下方）；
//       右侧=标题/价格 + 产品类型选择（系列切换）+ 规格参数 +
//       搭配使用（related 链接卡片）+ 预约咨询。
// 权威依据：实施方案 Phase E（/products/:id）+ 用户布局调整需求。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductDetail, getProducts, getSeries } from '../../api'
import type { ProductDetail as Detail } from '../../api/types'
import { sanitizeHtml } from '../../lib/sanitize'

export default function ProductDetail() {
  const { id } = useParams()
  const [data, setData] = useState<Detail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [activeImg, setActiveImg] = useState(0)
  // 产品类型（系列）相关状态
  const [seriesName, setSeriesName] = useState<string>('')
  const [siblings, setSiblings] = useState<{ id: number; name: string; cover_image?: string | null }[]>([])

  useEffect(() => {
    if (!id) return
    setData(null)
    getProductDetail(Number(id))
      .then((d) => { setData(d); setNotFound(false) })
      .catch(() => { setNotFound(true); setData(null) })
  }, [id])

  // 拉取系列映射 + 同系列产品（用于「产品类型选择」）
  useEffect(() => {
    if (!data) return
    let alive = true
    getSeries()
      .then((list) => {
        const hit = list.find((s) => s.id === data.series_id)
        if (alive) setSeriesName(hit?.name ?? '')
      })
      .catch(() => undefined)
    if (data.series_id) {
      getProducts({ series_id: data.series_id, page_size: 50 })
        .then((r) => {
          if (!alive) return
          setSiblings(r.items.filter((p) => p.id !== Number(id)).map((p) => ({ id: p.id, name: p.name, cover_image: p.cover_image })))
        })
        .catch(() => undefined)
    } else {
      setSiblings([])
    }
    return () => { alive = false }
  }, [data?.id, data?.series_id, id])

  if (notFound) {
    return <div className="min-h-[50vh] flex items-center justify-center text-ink-soft">产品不存在或已下架</div>
  }
  if (!data) {
    // 骨架屏（轻量占位）
    return <div className="mx-auto max-w-7xl px-6 py-12"><div className="animate-pulse h-96 bg-line rounded-xl2" /></div>
  }

  const images = [data.cover_image, ...(data.images ?? [])].filter(Boolean) as string[]
  const spec = data.spec ?? {}
  const specEntries = Object.entries(spec)

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <nav className="text-sm text-ink-soft mb-6" aria-label="面包屑">
        <Link to="/products" className="hover:text-gold">产品中心</Link>
        <span className="mx-2">/</span>
        <span>{data.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 左列：图廊 + 产品描述（图廊下方） */}
        <div>
          <img
            src={images[activeImg]}
            alt={data.name}
            className="w-full h-96 object-cover rounded-xl2 cursor-zoom-in shadow-card"
            onClick={() => setLightbox(images[activeImg])}
          />
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} aria-label={`查看第 ${i + 1} 张图`}
                  className={`rounded-lg overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-gold' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-20 h-16 object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* 产品描述（富文本，随页面自然滚动） */}
          {data.description && (
            <div className="mt-8">
              <h2 className="font-serif text-xl text-ink mb-3">产品描述</h2>
              <div className="text-ink-soft leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.description) }} />
            </div>
          )}
        </div>

        {/* 右列：信息区（原描述位置 → 产品类型选择） */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-ink mb-2">{data.name}</h1>
          <div className="text-sm text-ink-soft/60 mb-4">{data.product_code}</div>
          {/* 价格面议占位 */}
          <div className="text-2xl text-gold mb-6">{data.price_desc || '价格面议'}</div>

          {/* 产品类型选择（系列） */}
          {(seriesName || siblings.length > 0) && (
            <div className="mb-8">
              <h2 className="font-serif text-xl text-ink mb-3">产品类型</h2>
              {seriesName && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-ink-soft text-sm">所属系列：</span>
                  <Link to={`/products?series=${encodeURIComponent(seriesName)}`}
                    className="px-3 py-1 rounded-md bg-gold/15 text-gold text-sm font-medium hover:bg-gold/25 transition-colors">
                    {seriesName}
                  </Link>
                </div>
              )}
              {siblings.length > 0 && (
                <div>
                  <div className="text-ink-soft text-sm mb-2">同系列产品：</div>
                  <div className="flex flex-wrap gap-2">
                    {siblings.slice(0, 8).map((s) => (
                      <Link key={s.id} to={`/products/${s.id}`}
                        className="px-3 py-1 rounded-md border border-line text-ink-soft text-sm hover:border-gold hover:text-gold transition-colors">
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 规格参数（spec 键值 + 动态扩展） */}
          {specEntries.length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-xl text-ink mb-3">规格参数</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line rounded-lg overflow-hidden">
                {specEntries.map(([k, v]) => (
                  <div key={k} className="bg-white px-4 py-3 flex justify-between gap-4">
                    <dt className="text-ink-soft text-sm">{k}</dt>
                    <dd className="text-ink text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* 搭配使用（related 链接卡片） */}
          {data.related.length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-xl text-ink mb-3">搭配使用</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data.related.map((r) => (
                  <Link key={r.id} to={`/products/${r.id}`}
                    className="block rounded-lg overflow-hidden bg-white shadow-card hover:shadow-lg transition-shadow">
                    <img src={r.cover_image || ''} alt={r.name} className="w-full h-28 object-cover" />
                    <div className="p-3 text-sm text-ink hover:text-gold transition-colors">{r.name}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link to="/about/appointment"
            className="inline-block px-8 py-3 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 transition-opacity">
            预约咨询
          </Link>
        </div>
      </div>

      {/* 图片灯箱 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setLightbox(null)} role="dialog" aria-label="图片预览">
          <img src={lightbox} alt="放大预览" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-6 right-8 text-white text-3xl" onClick={() => setLightbox(null)} aria-label="关闭">×</button>
        </div>
      )}
    </div>
  )
}
