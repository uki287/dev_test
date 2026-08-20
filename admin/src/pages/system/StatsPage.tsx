// ============================================================
// 文件功能：数据统计页（Phase D）
// 功能：概览卡 / PV 趋势（7/30 天 SVG 折线）/ 页面 Top10（SVG 条形）/
//       预约·留言状态聚合（SVG 柱状）/ 报表导出 xlsx。
// 说明：纯 SVG 图表，无图表库依赖（方案 §6 后台技术）。
// 权威依据：实施方案 Phase D（数据统计）。
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Row, Segmented, Select, Statistic, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import {
  exportStatsReport, getAggregate, getPvTrend, getStatsOverview, getTopPages,
} from '../../api'
import type { AggItem, PvPoint, StatsOverview, TopPage } from '../../api/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消',
  processed: '已处理', closed: '已关闭',
}
const TYPE_LABEL: Record<string, string> = {
  showroom: '展厅参观', factory: '工厂考察', product: '产品咨询', cooperation: '渠道合作',
  aftersale: '售后服务', other: '其他',
}

export default function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [trendDays, setTrendDays] = useState(30)
  const [pvTrend, setPvTrend] = useState<PvPoint[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [aggKind, setAggKind] = useState<'appointment' | 'message'>('appointment')
  const [agg, setAgg] = useState<AggItem[]>([])

  useEffect(() => {
    getStatsOverview().then(setOverview).catch((e: any) => message.error(e.message || '概览加载失败'))
  }, [])
  useEffect(() => {
    getPvTrend(trendDays).then(setPvTrend).catch(() => undefined)
  }, [trendDays])
  useEffect(() => {
    getTopPages(7).then(setTopPages).catch(() => undefined)
  }, [])
  useEffect(() => {
    getAggregate(aggKind, 'status').then(setAgg).catch(() => undefined)
  }, [aggKind])

  // PV 折线坐标
  const line = useMemo(() => {
    if (!pvTrend.length) return null
    const W = 700, H = 220, PAD = { l: 36, r: 12, t: 14, b: 26 }
    const max = Math.max(...pvTrend.map((d) => d.pv), 1)
    const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b
    const pts = pvTrend.map((d) => {
      const x = PAD.l + (pvTrend.indexOf(d) * innerW) / (pvTrend.length - 1 || 1)
      const y = PAD.t + innerH - (d.pv / max) * innerH
      return { x, y, ...d }
    })
    return { W, H, PAD, pts, line: pts.map((p) => `${p.x},${p.y}`).join(' '), max }
  }, [pvTrend])

  // Top10 条形坐标
  const bars = useMemo(() => {
    if (!topPages.length) return null
    const max = Math.max(...topPages.map((t) => t.pv), 1)
    return topPages.map((t) => ({ ...t, ratio: t.pv / max }))
  }, [topPages])

  // 聚合柱状坐标
  const aggBars = useMemo(() => {
    if (!agg.length) return null
    const max = Math.max(...agg.map((a) => a.count), 1)
    return agg.map((a) => ({ ...a, label: STATUS_LABEL[a.key] ?? TYPE_LABEL[a.key] ?? a.key, ratio: a.count / max }))
  }, [agg])

  return (
    <div>
      {/* 概览卡 */}
      <Row gutter={16}>
        {overview && [
          { title: '预约总数', value: overview.appointment },
          { title: '留言总数', value: overview.message },
          { title: '产品总数', value: overview.product },
          { title: '招聘岗位', value: overview.job },
          { title: '今日新增预约', value: overview.today_appointment },
          { title: '今日新增留言', value: overview.today_message },
          { title: '今日 PV', value: overview.today_pv },
        ].map((c) => (
          <Col span={6} key={c.title} style={{ marginBottom: 16 }}>
            <Card size="small">
              <Statistic title={c.title} value={c.value} valueStyle={{ fontSize: 22, color: '#1A1A1A' }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        {/* PV 趋势 */}
        <Col span={16}>
          <Card
            title="访问 PV 趋势"
            extra={<Segmented options={[{ label: '7天', value: 7 }, { label: '30天', value: 30 }]} value={trendDays} onChange={(v) => setTrendDays(v as number)} />}
            styles={{ body: { padding: 8 } }}
          >
            {line ? (
              <svg width="100%" viewBox={`0 0 ${line.W} ${line.H}`} role="img" aria-label="PV趋势折线图">
                {[0, 0.5, 1].map((r, i) => (
                  <g key={i}>
                    <line x1={line.PAD.l} y1={line.PAD.t + (line.H - line.PAD.t - line.PAD.b) * r} x2={line.W - line.PAD.r} y2={line.PAD.t + (line.H - line.PAD.t - line.PAD.b) * r} stroke="#E5E0D8" strokeDasharray="4 4" />
                    <text x={4} y={line.PAD.t + (line.H - line.PAD.t - line.PAD.b) * r + 4} fontSize={11} fill="#999">{Math.round(line.max * (1 - r))}</text>
                  </g>
                ))}
                <polyline points={line.line} fill="none" stroke="#B98A2F" strokeWidth={2.5} strokeLinejoin="round" />
                {line.pts.map((p) => (
                  <g key={p.date}>
                    <circle cx={p.x} cy={p.y} r={3} fill="#B98A2F" />
                    {trendDays === 7 && <text x={p.x - 14} y={line.H - 8} fontSize={10} fill="#666">{p.date.slice(5)}</text>}
                  </g>
                ))}
              </svg>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>

        {/* Top10 页面 */}
        <Col span={8}>
          <Card title="页面访问 Top10（近 7 天）" styles={{ body: { padding: 8 } }}>
            {bars ? (
              <svg width="100%" viewBox="0 0 320 220" role="img" aria-label="Top10页面条形图">
                {bars.map((b, i) => {
                  const y = 14 + i * 20
                  return (
                    <g key={b.path}>
                      <rect x={110} y={y} width={(320 - 130) * b.ratio} height={13} rx={3} fill="#B98A2F" opacity={0.85} />
                      <text x={104} y={y + 10} fontSize={10} fill="#666" textAnchor="end" style={{ maxWidth: 100 }}>{b.path.length > 12 ? b.path.slice(0, 11) + '…' : b.path}</text>
                      <text x={110 + (320 - 130) * b.ratio + 4} y={y + 10} fontSize={10} fill="#8A6A2F">{b.pv}</text>
                    </g>
                  )
                })}
              </svg>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 预约/留言状态聚合 */}
        <Col span={16}>
          <Card
            title="业务状态分布"
            extra={
              <Select value={aggKind} style={{ width: 130 }} onChange={setAggKind}
                options={[{ label: '预约', value: 'appointment' }, { label: '留言', value: 'message' }]} />
            }
            styles={{ body: { padding: 8 } }}
          >
            {aggBars ? (
              <svg width="100%" viewBox="0 0 700 200" role="img" aria-label="状态分布柱状图">
                {aggBars.map((a, i) => {
                  const bw = 90, gap = (700 - aggBars.length * bw) / (aggBars.length + 1)
                  const x = gap + i * (bw + gap)
                  const h = 150 * a.ratio
                  return (
                    <g key={a.key}>
                      <rect x={x} y={20 + 150 - h} width={bw} height={h} rx={6} fill="#B98A2F" opacity={0.85} />
                      <text x={x + bw / 2} y={16 + 150 - h} fontSize={12} fill="#8A6A2F" textAnchor="middle">{a.count}</text>
                      <text x={x + bw / 2} y={192} fontSize={11} fill="#666" textAnchor="middle">{a.label}</text>
                    </g>
                  )
                })}
              </svg>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>

        {/* 报表导出 */}
        <Col span={8}>
          <Card title="报表导出">
            <p style={{ color: '#888', marginBottom: 16 }}>导出近 30 天 PV 趋势、预约与留言状态分布为 Excel 报表。</p>
            <Button type="primary" icon={<DownloadOutlined />} style={{ background: '#B98A2F' }}
              onClick={() => exportStatsReport().catch((e: any) => message.error(e.message || '导出失败'))}>
              导出统计报表
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
