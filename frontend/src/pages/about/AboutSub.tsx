// ============================================================
// 文件功能：关于子页（关于我们/品牌介绍 + 发展历程/品牌历程，Phase E）
// 组成：
//   ContentSub：company_intro（关于我们 D1）/ brand_intro（品牌介绍）→ 段落渲染；
//   TimelineSub：history / brand_history → 水平时间轴（移动端降级竖向）。
// 权威依据：实施方案 Phase E（关于：company/history/brand-history/brand）+ D1。
// ============================================================
import { useEffect, useState } from 'react'
import { getAboutPages, getTimeline } from '../../api'
import type { AboutPage, Timeline } from '../../api/types'
import Pagination from '../../components/Pagination'

// ---------- 内容型子页（公司简介 / 品牌介绍） ----------
export function ContentSub({ pageKey, fallbackTitle }: { pageKey: string; fallbackTitle: string }) {
  const [page, setPage] = useState<AboutPage | null>(null)

  useEffect(() => {
    getAboutPages()
      .then((pages) => setPage(pages.find((p) => p.page_key === pageKey) ?? null))
      .catch(() => setPage(null))
  }, [pageKey])

  const content = page?.content
  const title = content?.title || fallbackTitle
  const blocks = content?.blocks ?? []

  return (
    <div>
      {/* 页头 hero（深色品牌带，提升视觉分量，弱化底部留白感） */}
      <div className="bg-gradient-to-br from-ink to-ink/90 text-cream">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="text-gold/80 text-sm tracking-[0.3em] uppercase mb-3">About</div>
          <h1 className="font-serif text-4xl md:text-5xl">{title}</h1>
        </div>
      </div>
      {/* 内容区（加宽行距、标题装饰条，内容短也不显空） */}
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="space-y-10">
          {blocks.map((b, i) => (
            <div key={i}>
              {b.h && (
                <h2 className="font-serif text-2xl text-ink mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-gold rounded-full" />
                  {b.h}
                </h2>
              )}
              {b.p && <p className="text-ink-soft leading-loose text-[15px]">{b.p}</p>}
            </div>
          ))}
        </div>
        {blocks.length === 0 && <p className="text-ink-soft">内容整理中…</p>}
      </div>
    </div>
  )
}

// ---------- 时间轴子页（发展历程 / 品牌历程） ----------
export function TimelineSub({ type, fallbackTitle }: { type: 'history' | 'brand_history'; fallbackTitle: string }) {
  const [items, setItems] = useState<Timeline[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 6

  useEffect(() => {
    getTimeline(type).then(setItems).catch(() => setItems([]))
  }, [type])

  // 切换历程类型时回到第 1 页
  useEffect(() => { setPage(1) }, [type])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-4xl text-ink mb-12">{fallbackTitle}</h1>

      {/* 时间轴：桌面水平（连续金线 + 大年份节点 + 描述卡）、移动端竖向 */}
      <div className="relative mx-auto max-w-5xl pt-2 pb-2">
        {/* 桌面水平连接线 */}
        <div className="hidden md:block absolute top-3 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        {/* 移动端竖向连接线 */}
        <div className="md:hidden absolute left-[7px] top-2 bottom-2 w-0.5 bg-gold/30" />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-8">
          {pageItems.map((t) => (
            <div key={t.id} className="relative pl-12 md:pl-0 md:text-center flex flex-col md:items-center">
              {/* 节点 */}
              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-1 w-4 h-4 rounded-full bg-gold ring-4 ring-cream z-10" />
              <div className="font-serif text-3xl text-gold md:mt-8">{t.year}</div>
              <div className="font-medium text-ink text-lg mt-2">{t.title}</div>
              {t.description && (
                <p className="text-ink-soft mt-2 leading-relaxed md:max-w-xs md:mx-auto">{t.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {items.length === 0 && <p className="text-center text-ink-soft">时间轴整理中…</p>}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
