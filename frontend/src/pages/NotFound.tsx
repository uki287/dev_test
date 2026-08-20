// ============================================================
// 文件功能：全局 404 页
// ============================================================
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="font-serif text-7xl text-gold mb-4">404</div>
      <p className="text-ink-soft text-lg mb-8">抱歉，您访问的页面不存在</p>
      <Link
        to="/"
        className="px-6 py-3 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 transition-opacity"
      >
        返回首页
      </Link>
    </div>
  )
}
