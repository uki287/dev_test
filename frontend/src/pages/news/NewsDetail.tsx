// ============================================================
// 文件功能：新闻详情页（Phase E）
// 功能：正文渲染、浏览量 +1（后端）、上下篇导航。
// 权威依据：实施方案 Phase E（新闻详情：views+1、上下篇）。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getNewsDetail } from '../../api'
import type { NewsDetail as Detail } from '../../api/types'
import { sanitizeHtml } from '../../lib/sanitize'

export default function NewsDetail() {
  const { id } = useParams()
  const [data, setData] = useState<Detail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    if (!id) return
    getNewsDetail(Number(id))
      .then((d) => { setData(d); setActiveImg(0); setNotFound(false) })
      .catch(() => { setNotFound(true); setData(null) })
  }, [id])

  if (notFound) return <div className="min-h-[50vh] flex items-center justify-center text-ink-soft">新闻不存在</div>
  if (!data) return <div className="mx-auto max-w-3xl px-6 py-12"><div className="animate-pulse h-80 bg-line rounded-xl2" /></div>

  // 图集：优先 images，旧数据回退到 cover_image
  const images = data.images?.length ? data.images : data.cover_image ? [data.cover_image] : []

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <nav className="text-sm text-ink-soft mb-6" aria-label="面包屑">
        <Link to={data.category === 'industry' ? '/news/industry' : '/news/company'} className="hover:text-gold">
          {data.category === 'industry' ? '行业资讯' : '企业动态'}
        </Link>
        <span className="mx-2">/</span>
        <span>{data.title}</span>
      </nav>

      <h1 className="font-serif text-3xl md:text-4xl text-ink leading-snug mb-4">{data.title}</h1>
      <div className="flex items-center gap-4 text-sm text-ink-soft/70 mb-8">
        {data.author && <span>{data.author}</span>}
        {data.source && <span>来源：{data.source}</span>}
        <span>{data.published_at ? String(data.published_at).slice(0, 10) : ''}</span>
        <span>{data.views} 次浏览</span>
      </div>

      {/* 图集：主图 + 缩略图切换 */}
      {images.length > 0 && (
        <figure className="mb-8">
          <img
            src={images[activeImg]}
            alt={data.title}
            className="w-full rounded-xl2 object-cover max-h-[420px]"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1" role="group" aria-label="新闻图片列表">
              {images.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`查看第 ${i + 1} 张图`}
                  aria-current={i === activeImg}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-gold' : 'border-transparent hover:border-gold/50'
                  }`}
                >
                  <img src={url} alt="" className="w-20 h-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </figure>
      )}

      {/* 正文（富文本 HTML） */}
      <div
        className="prose prose-lg max-w-none text-ink-soft leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content) }}
      />

      {/* 上下篇 */}
      <div className="border-t border-line mt-12 pt-6 space-y-3">
        {data.prev ? (
          <div className="text-sm"><span className="text-ink-soft">上一篇：</span>
            <Link to={`/news/${data.prev.id}`} className="text-ink hover:text-gold transition-colors">{data.prev.title}</Link>
          </div>
        ) : <div className="text-sm text-ink-soft">上一篇：没有了</div>}
        {data.next ? (
          <div className="text-sm"><span className="text-ink-soft">下一篇：</span>
            <Link to={`/news/${data.next.id}`} className="text-ink hover:text-gold transition-colors">{data.next.title}</Link>
          </div>
        ) : <div className="text-sm text-ink-soft">下一篇：没有了</div>}
      </div>
    </article>
  )
}
