// ============================================================
// 文件功能：工作台页（统计概览）
// 说明：
//   - 4 张统计卡（预约/留言/产品/新闻），数据来自 /admin/stats/dashboard；
//   - 近 7 天 PV 纯 SVG 折线图（无图表库依赖，方案 §6 后台技术）；
//   - 快捷入口卡片（按当前用户权限过滤，无权限不展示）。
// 权威依据：实施方案 Phase C（工作台：4 统计卡 + 7 天 PV 折线 + 快捷入口）。
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row, Statistic, Spin, message } from 'antd'
import {
  CalendarOutlined, CommentOutlined, GiftOutlined, ReadOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../api'
import type { DashboardStats } from '../api'
import { useAuth, matchPerm } from '../store/auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e: any) => message.error(e.message || '统计加载失败'))
  }, [])

  // 快捷入口（按权限过滤，L-05）
  const shortcuts = useMemo(() => {
    const perms = user?.perms ?? []
    const all = [
      { path: '/banners', label: '轮播图管理', icon: '🎠', perm: 'banner:list' },
      { path: '/products', label: '产品管理', icon: '📦', perm: 'product:list' },
      { path: '/news', label: '新闻管理', icon: '📰', perm: 'news:list' },
      { path: '/about', label: '关于管理', icon: '🏛️', perm: 'about:list' },
      { path: '/settings', label: '系统设置', icon: '⚙️', perm: 'setting:list' },
    ]
    return all.filter((s) => matchPerm(perms, s.perm))
  }, [user])

  // 纯 SVG 折线：根据 pv7 数据计算坐标
  const chart = useMemo(() => {
    if (!stats || stats.pv7.length === 0) return null
    const W = 860, H = 220, PAD = { l: 36, r: 16, t: 16, b: 28 }
    const data = stats.pv7
    const max = Math.max(...data.map((d) => d.pv), 1)
    const innerW = W - PAD.l - PAD.r
    const innerH = H - PAD.t - PAD.b
    const pts = data.map((d, i) => {
      const x = PAD.l + (i * innerW) / (data.length - 1 || 1)
      const y = PAD.t + innerH - (d.pv / max) * innerH
      return { x, y, ...d }
    })
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
    const gridY = [0, 0.5, 1].map((r) => PAD.t + innerH * r)
    return { W, H, PAD, pts, line, gridY, max }
  }, [stats])

  return (
    <div>
      <Row gutter={16}>
        {/* 4 张统计卡 */}
        {[
          { title: '预约总数', value: stats?.appointment ?? '-', icon: <CalendarOutlined style={{ color: '#B98A2F' }} /> },
          { title: '留言总数', value: stats?.message ?? '-', icon: <CommentOutlined style={{ color: '#B98A2F' }} /> },
          { title: '产品总数', value: stats?.product ?? '-', icon: <GiftOutlined style={{ color: '#B98A2F' }} /> },
          { title: '新闻总数', value: stats?.news ?? '-', icon: <ReadOutlined style={{ color: '#B98A2F' }} /> },
        ].map((c) => (
          <Col span={6} key={c.title}>
            <Card>
              <Statistic title={c.title} value={c.value as number} prefix={c.icon} valueStyle={{ color: '#1A1A1A' }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 7 天 PV 折线（纯 SVG） */}
        <Col span={16}>
          <Card title="近 7 天访问量 (PV)" styles={{ body: { padding: 8 } }}>
            {!stats ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : chart ? (
              <svg width="100%" viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="近7天PV折线图">
                {/* 网格线 */}
                {chart.gridY.map((y, i) => (
                  <g key={i}>
                    <line x1={chart.PAD.l} y1={y} x2={chart.W - chart.PAD.r} y2={y} stroke="#E5E0D8" strokeDasharray="4 4" />
                    <text x={4} y={y + 4} fontSize={11} fill="#999">
                      {Math.round(chart.max * (1 - i / 2))}
                    </text>
                  </g>
                ))}
                {/* 折线 + 数据点 */}
                <polyline points={chart.line} fill="none" stroke="#B98A2F" strokeWidth={2.5} strokeLinejoin="round" />
                {chart.pts.map((p) => (
                  <g key={p.date}>
                    <circle cx={p.x} cy={p.y} r={3.5} fill="#B98A2F" />
                    <text x={p.x - 18} y={p.y - 8} fontSize={10} fill="#8A6A2F">
                      {p.pv}
                    </text>
                    <text x={p.x - 14} y={chart.H - 8} fontSize={11} fill="#666">
                      {p.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无 PV 数据</div>
            )}
          </Card>
        </Col>

        {/* 快捷入口 */}
        <Col span={8}>
          <Card title="快捷入口" styles={{ body: { padding: '12px 16px' } }}>
            {shortcuts.map((s) => (
              <div
                key={s.path}
                onClick={() => navigate(s.path)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 8px', cursor: 'pointer', borderRadius: 8,
                  borderBottom: '1px solid #F0EBE3',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF6EE')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>
                  <span style={{ marginRight: 8 }}>{s.icon}</span>
                  {s.label}
                </span>
                <RightOutlined style={{ color: '#B98A2F' }} />
              </div>
            ))}
            {shortcuts.length === 0 && <div style={{ color: '#999', padding: 12 }}>当前角色无可用快捷入口</div>}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
