// ============================================================
// 文件功能：前台页脚（深底金字）
// 说明：品牌区 + 快速链接 + 联系方式 + ICP/版权（读站点配置）。
// ============================================================
import { Link } from 'react-router-dom'
import { useSite } from '../store/site'
import type { CompanyInfo } from '../api/types'

export default function Footer({ company }: { company: CompanyInfo[] }) {
  const settings = useSite((s) => s.settings)
  const infoMap = Object.fromEntries(company.map((c) => [c.info_key, c.info_value]))

  return (
    <footer className="bg-ink text-gold" style={{ background: '#0E0E0E' }}>
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* 品牌 */}
        <div>
          <div className="font-serif text-2xl text-gold mb-3">{settings?.site_name || 'TP智能家居'}</div>
          <p className="text-sm text-white/50">高端智能家居整体解决方案</p>
        </div>
        {/* 快速链接 */}
        <div>
          <div className="text-sm font-medium mb-3 text-white">快速导航</div>
          <ul className="space-y-2 text-sm text-gold/80">
            <li><Link to="/products">产品中心</Link></li>
            <li><Link to="/news/industry">新闻资讯</Link></li>
            <li><Link to="/jobs/industry">加入我们</Link></li>
            <li><Link to="/about/company">关于我们</Link></li>
            <li><Link to="/contact">联系我们</Link></li>
          </ul>
        </div>
        {/* 联系方式 */}
        <div>
          <div className="text-sm font-medium mb-3 text-white">联系方式</div>
          <ul className="space-y-2 text-sm text-gold/80">
            <li>{infoMap.address || '深圳市南山区科技园'}</li>
            <li>{infoMap.phone || '-'}</li>
            <li>{infoMap.email || '-'}</li>
            <li>{infoMap.business_hours || '周一至周日 9:00-18:00'}</li>
          </ul>
        </div>
        {/* 预约 CTA */}
        <div>
          <div className="text-sm font-medium mb-3 text-white">预约参观</div>
          <p className="text-sm text-gold/80 mb-4">预约展厅参观或工厂考察</p>
          <Link
            to="/about/appointment"
            className="inline-block px-5 py-2 rounded-md2 bg-gold text-ink text-sm font-medium hover:opacity-90 transition-opacity"
          >
            立即预约
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        {settings?.copyright || '© 2026 TP智能家居'}　{settings?.icp || ''}
      </div>
    </footer>
  )
}
