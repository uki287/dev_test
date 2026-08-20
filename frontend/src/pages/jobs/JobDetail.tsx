// ============================================================
// 文件功能：职位详情页（Phase E）
// 功能：岗位职责/任职要求（富文本 HTML）、投递（mailto: C-07 已定）。
// 说明：数据来自 /jobs 列表（含全部字段），按 id 匹配。
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getJobs } from '../../api'
import type { Job } from '../../api/types'
import { sanitizeHtml } from '../../lib/sanitize'

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState<Job | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getJobs()
      .then((list) => {
        const found = list.find((j) => j.id === Number(id))
        if (found) { setJob(found); setNotFound(false) } else { setNotFound(true) }
      })
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) return <div className="min-h-[50vh] flex items-center justify-center text-ink-soft">职位不存在</div>
  if (!job) return <div className="mx-auto max-w-3xl px-6 py-12"><div className="animate-pulse h-80 bg-line rounded-xl2" /></div>

  // mailto 投递（C-07：投递方式已定 mailto）
  const mailto = job.email
    ? `mailto:${job.email}?subject=${encodeURIComponent(`应聘：${job.title}`)}`
    : undefined

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav className="text-sm text-ink-soft mb-6" aria-label="面包屑">
        <Link to={job.category === 'industry' ? '/jobs/industry' : '/jobs/campus'} className="hover:text-gold">
          {job.category === 'industry' ? '社会招聘' : '校园招聘'}
        </Link>
        <span className="mx-2">/</span>
        <span>{job.title}</span>
      </nav>

      <h1 className="font-serif text-3xl md:text-4xl text-ink mb-3">{job.title}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-ink-soft mb-8">
        {job.location && <span>📍 {job.location}</span>}
        {job.count ? <span>招聘 {job.count} 人</span> : null}
        {job.salary_desc && <span className="text-gold">{job.salary_desc}</span>}
      </div>

      <section className="mb-8">
        <h2 className="font-serif text-xl text-ink mb-3">岗位职责</h2>
        <div className="prose max-w-none text-ink-soft leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.duty) }} />
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-xl text-ink mb-3">任职要求</h2>
        <div className="prose max-w-none text-ink-soft leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.requirement) }} />
      </section>

      {mailto ? (
        <a href={mailto}
          className="inline-block px-8 py-3 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 transition-opacity">
          投递简历（{job.email}）
        </a>
      ) : (
        <div className="text-ink-soft">该职位暂未开放投递</div>
      )}
    </div>
  )
}
