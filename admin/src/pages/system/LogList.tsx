// ============================================================
// 文件功能：操作日志页（Phase D）
// 功能：只读分页列表，支持按操作人 / 模块 / 时间范围筛选。
// 说明：日志不存明文手机号（S-07）；保留 180 天（清理由部署 cron 落实）。
// 权威依据：实施方案 Phase D（操作日志）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, DatePicker, Input, Space, Table, Tag, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getLogs } from '../../api'
import type { LogItem } from '../../api/types'

const { RangePicker } = DatePicker

export default function LogList() {
  const [items, setItems] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ username?: string; module?: string }>({})

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getLogs({ page: p, page_size: 20, ...filters })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const columns: ColumnsType<LogItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '操作人', dataIndex: 'username', width: 110, render: (v) => (v ? <Tag color="gold">{v}</Tag> : '-') },
    { title: '模块', dataIndex: 'module', width: 100 },
    { title: '动作', dataIndex: 'action', width: 120 },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    { title: '时间', dataIndex: 'created_date', width: 160 },
  ]

  return (
    <Card title="操作日志" extra={<Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="操作人" style={{ width: 160 }} onSearch={(v) => { setFilters((f) => ({ ...f, username: v || undefined })); setPage(1) }} />
        <Input.Search allowClear placeholder="模块" style={{ width: 140 }} onSearch={(v) => { setFilters((f) => ({ ...f, module: v || undefined })); setPage(1) }} />
        <RangePicker
          onChange={(dates) => {
            setFilters((f) => ({
              ...f,
              start_at: dates?.[0] ? dates[0].format('YYYY-MM-DD 00:00:00') : undefined,
              end_at: dates?.[1] ? dates[1].format('YYYY-MM-DD 23:59:59') : undefined,
            }))
            setPage(1)
          }}
        />
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />
    </Card>
  )
}
