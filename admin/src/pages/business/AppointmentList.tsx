// ============================================================
// 文件功能：预约管理页（Phase D）
// 功能：脱敏列表 / 详情明文 / 状态流转 + 处理备注 / 批量标记 / 导出 xlsx / 软删。
// 隐私：列表手机号脱敏（138****1234），详情需处理权限看明文（S-07）。
// 权威依据：实施方案 Phase D（预约管理）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Descriptions, Drawer, Modal, Popconfirm, Select, Space, Table, Tag, message,
} from 'antd'
import { DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  batchAppointmentStatus, deleteAppointment, exportAppointments, getAppointmentDetail,
  getAppointments, updateAppointmentStatus,
} from '../../api'
import type { Appointment, AppointmentDetail } from '../../api/types'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  confirmed: { text: '已确认', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'red' },
}
const TYPE_MAP: Record<string, string> = { showroom: '展厅参观', factory: '工厂考察' }

export default function AppointmentList() {
  const [items, setItems] = useState<Appointment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ status?: string; appt_type?: string }>({})
  const [selected, setSelected] = useState<number[]>([])
  const [detail, setDetail] = useState<AppointmentDetail | null>(null)
  const [handleOpen, setHandleOpen] = useState(false)
  const [handling, setHandling] = useState<Appointment | null>(null)
  const [handleStatus, setHandleStatus] = useState('pending')
  const [handleRemark, setHandleRemark] = useState('')

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getAppointments({ page: p, page_size: 20, ...filters })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const onView = async (r: Appointment) => {
    try {
      setDetail(await getAppointmentDetail(r.id)) // 详情明文
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
  }

  const onHandle = async () => {
    if (!handling) return
    try {
      await updateAppointmentStatus(handling.id, { status: handleStatus, handle_remark: handleRemark || undefined })
      message.success('已更新')
      setHandleOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  const onBatch = async (status: string) => {
    if (!selected.length) { message.warning('请先勾选预约'); return }
    try {
      await batchAppointmentStatus(selected, status)
      message.success('批量标记完成')
      setSelected([])
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  const onDelete = async (r: Appointment) => {
    try {
      await deleteAppointment(r.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<Appointment> = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '手机号（脱敏）', dataIndex: 'phone', width: 130 },
    { title: '类型', dataIndex: 'appt_type', width: 100, render: (v) => TYPE_MAP[v] ?? v },
    { title: '期望日期', dataIndex: 'appt_date', width: 110, render: (v) => v || '-' },
    { title: '时段', dataIndex: 'appt_slot', width: 80, render: (v) => (v === 'morning' ? '上午' : v === 'afternoon' ? '下午' : v || '-') },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.text ?? v}</Tag> },
    { title: '提交时间', dataIndex: 'created_date', width: 150, render: (v) => (v ? String(v).slice(0, 16) : '-') },
    { title: '操作', width: 210, render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EyeOutlined />} onClick={() => onView(r)}>详情</Button>
        <Button size="small" onClick={() => { setHandling(r); setHandleStatus(r.status); setHandleRemark(r.remark ?? ''); setHandleOpen(true) }}>处理</Button>
        <Popconfirm title="确定删除该预约？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card
      title="预约管理"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportAppointments().catch((e) => message.error(e.message || '导出失败'))}>导出 Excel</Button>
          <Select placeholder="批量标记为" style={{ width: 140 }} allowClear
            options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
            onChange={(v) => v && onBatch(v)} />
        </Space>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="状态" style={{ width: 130 }}
          options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
        <Select allowClear placeholder="类型" style={{ width: 130 }}
          options={Object.entries(TYPE_MAP).map(([v, t]) => ({ label: t, value: v }))}
          onChange={(v) => setFilters((f) => ({ ...f, appt_type: v }))} />
        {selected.length > 0 && <Tag color="gold">已选 {selected.length} 项</Tag>}
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      {/* 详情（明文） */}
      <Modal title="预约详情" open={!!detail} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="手机号（明文）">{detail.phone}</Descriptions.Item>
            <Descriptions.Item label="类型">{TYPE_MAP[detail.appt_type] ?? detail.appt_type}</Descriptions.Item>
            <Descriptions.Item label="期望日期">{detail.appt_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="时段">{detail.appt_slot === 'morning' ? '上午' : detail.appt_slot === 'afternoon' ? '下午' : '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="来源页">{detail.source_page || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{STATUS_MAP[detail.status]?.text ?? detail.status}</Descriptions.Item>
            <Descriptions.Item label="处理备注">{detail.handle_remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{detail.created_date ? String(detail.created_date).slice(0, 16) : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 处理抽屉：状态流转 + 备注 */}
      <Drawer title={`处理预约：${handling?.name ?? ''}`} width={420} open={handleOpen} onClose={() => setHandleOpen(false)}
        extra={<Space>
          <Button onClick={() => setHandleOpen(false)}>取消</Button>
          <Button type="primary" onClick={onHandle} style={{ background: '#B98A2F' }}>保存</Button>
        </Space>}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>目标状态（支持流转与回退）：</div>
          <Select style={{ width: '100%' }} value={handleStatus} onChange={setHandleStatus}
            options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
        </div>
        <div style={{ marginBottom: 8 }}>处理备注：</div>
        <InputTextArea value={handleRemark} onChange={setHandleRemark} placeholder="处理说明（≤500 字）" />
      </Drawer>
    </Card>
  )
}

// 简易文本域（避免多余 import）
import { Input } from 'antd'
function InputTextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input.TextArea rows={3} value={value} maxLength={500} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}