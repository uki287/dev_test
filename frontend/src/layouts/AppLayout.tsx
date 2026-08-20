// ============================================================
// 文件功能：前台主布局（Navbar + 内容出口 + Footer）
// 说明：挂载时加载站点配置（settings）与联系方式（company_info），
//       供 Navbar（站名）与 Footer（联系方式/版权）使用。
// ============================================================
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getCompanyInfo, getSettings } from '../api'
import type { CompanyInfo } from '../api/types'
import { useSite } from '../store/site'

export default function AppLayout() {
  const setSettings = useSite((s) => s.setSettings)
  const [company, setCompany] = useState<CompanyInfo[]>([])

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined)
    getCompanyInfo().then(setCompany).catch(() => setCompany([]))
  }, [setSettings])

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      <Navbar />
      {/* 内容区：顶部留白给 fixed 导航 */}
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer company={company} />
    </div>
  )
}
