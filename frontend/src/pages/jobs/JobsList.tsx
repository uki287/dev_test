// ============================================================
// 文件功能：招聘列表页（社会招聘 / 校园招聘，Phase E）
// 功能：栏目由路由参数决定（/jobs/industry、/jobs/campus），
//       岗位卡片（人数/地点/薪资/投递入口）。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getJobs } from '../../api'
import type { Job } from '../../api/types'
import Pagination from '../../components/Pagination'

const CAT: Record<string, { label: string; desc: string }> = {
  industry: { label: '社会招聘', desc: '加入 TP，共创智能生活' },
  campus: { label: '校园招聘', desc: '面向应届毕业生' },
}

export default function JobsList() {
  // 路由为静态路径（/jobs/industry、/jobs/campus），无动态段，
  // 故从 pathname 解析分类，避免 useParams 恒为空导致切换失效
  const { pathname } = useLocation()
  const category: 'industry' | 'campus' = pathname.startsWith('/jobs/campus') ? 'campus' : 'industry'
  const [items, setItems] = useState<Job[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    getJobs({ category: category as 'industry' | 'campus' })
      .then(setItems)
      .catch(() => setItems([]))
  }, [category])

  // 切换栏目时回到第 1 页
  useEffect(() => { setPage(1) }, [category])

  const meta = CAT[category] ?? CAT.industry
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl text-ink mb-2">{meta.label}</h1>
        <p className="text-ink-soft">{meta.desc}</p>
      </div>

      <div className="space-y-4">
        {pageItems.map((j) => (
          <div key={j.id} className="bg-white rounded-xl2 shadow-card p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-serif text-xl text-ink mb-1">{j.title}</div>
              <div className="flex flex-wrap gap-4 text-sm text-ink-soft">
                {j.location && <span>📍 {j.location}</span>}
                {j.count ? <span>招聘 {j.count} 人</span> : null}
                {j.salary_desc && <span className="text-gold">{j.salary_desc}</span>}
              </div>
            </div>
            <Link to={`/jobs/${j.id}`}
              className="px-6 py-2.5 rounded-md2 border border-gold text-gold text-sm hover:bg-gold hover:text-ink transition-colors">
              查看详情
            </Link>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-center py-16 text-ink-soft">暂无在招岗位</div>}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
