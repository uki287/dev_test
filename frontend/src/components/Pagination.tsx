// ============================================================
// 文件功能：共享分页控件（与产品页同款视觉）
// 说明：上一页 / 第 x / y 页 / 下一页，居中、金色 hover；
//       仅当 totalPages > 1 时渲染（单页自动隐藏）。
// 用法：<Pagination page={page} totalPages={totalPages} onChange={setPage} />
// ============================================================
interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex justify-center gap-2 mt-12">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-4 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors"
      >
        上一页
      </button>
      <span className="px-4 py-2 text-sm text-ink-soft">第 {page} / {totalPages} 页</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-4 py-2 rounded-md2 border border-line text-sm disabled:opacity-40 hover:border-gold hover:text-gold transition-colors"
      >
        下一页
      </button>
    </div>
  )
}
