// ============================================================
// 文件功能：留言管理页（Phase D）
// 功能：脱敏列表 / 详情明文（含来源产品名）/ 状态流转 + 备注 / 批量标记 / 导出 / 软删。
// 权威依据：实施方案 Phase D（留言管理，message:view/handle/export）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Descriptions, Drawer, Input, Modal, Popconfirm, Select, Space, Table, Tag, message,
} from 'antd'
import { DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  batchMessageStatus, deleteMessage, exportMessages, getMessageDetail, getMessages,
  updateMessageStatus,
} from '../../api'
import type { Message, MessageDetail } from '../../api/types'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  processed: { text: '已处理', color: 'green' },
  closed: { text: '已关闭', color: 'default' },
}
const TYPE_MAP: Record<string, string> = {
  product: '产品咨询', cooperation: '渠道合作', aftersale: '售后服务', other: '其他',
}

export default function MessageList() {
  const [items, setItems] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>()
  const [selected, setSelected] = useState<number[]>([])
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [handleOpen, setHandleOpen] = useState(false)
  const [handling, setHandling] = useState<Message | null>(null)
  const [handleStatus, setHandleStatus] = useState('pending')
  const [handleRemark, setHandleRemark] = useState('')

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getMessages({ page: p, page_size: 20, status })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])

  const onView = async (r: Message) => {
    try {
      setDetail(await getMessageDetail(r.id))
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
  }

  const onHandle = async () => {
    if (!handling) return
    try {
      await updateMessageStatus(handling.id, { status: handleStatus, handle_remark: handleRemark || undefined })
      message.success('已更新')
      setHandleOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  const onBatch = async (s: string) => {
    if (!selected.length) { message.warning('请先勾选留言'); return }
    try {
      await batchMessageStatus(selected, s)
      message.success('批量标记完成')
      setSelected([])
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  const onDelete = async (r: Message) => {
    try {
      await deleteMessage(r.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<Message> = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '手机号（脱敏）', dataIndex: 'phone', width: 130 },
    { title: '类型', dataIndex: 'type', width: 100, render: (v) => <Tag>{TYPE_MAP[v] ?? v}</Tag> },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.text ?? v}</Tag> },
    { title: '提交时间', dataIndex: 'created_date', width: 150, render: (v) => (v ? String(v).slice(0, 16) : '-') },
    { title: '操作', width: 210, render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EyeOutlined />} onClick={() => onView(r)}>详情</Button>
        <Button size="small" onClick={() => { setHandling(r); setHandleStatus(r.status); setHandleRemark(''); setHandleOpen(true) }}>处理</Button>
        <Popconfirm title="确定删除该留言？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card
      title="留言管理"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportMessages().catch((e) => message.error(e.message || '导出失败'))}>导出 Excel</Button>
          <Select placeholder="批量标记为" style={{ width: 140 }} allowClear
            options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
            onChange={(v) => v && onBatch(v)} />
        </Space>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="状态" style={{ width: 130 }}
          options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
          onChange={(v) => setStatus(v)} />
        {selected.length > 0 && <Tag color="gold">已选 {selected.length} 项</Tag>}
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      {/* 详情（明文 + 产品名） */}
      <Modal title="留言详情" open={!!detail} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="手机号（明文）">{detail.phone}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detail.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">{TYPE_MAP[detail.type] ?? detail.type}</Descriptions.Item>
            <Descriptions.Item label="内容">{detail.content}</Descriptions.Item>
            <Descriptions.Item label="来源产品">{detail.product_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="来源页">{detail.source_page || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{STATUS_MAP[detail.status]?.text ?? detail.status}</Descriptions.Item>
            <Descriptions.Item label="处理备注">{detail.handle_remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{detail.created_date ? String(detail.created_date).slice(0, 16) : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 处理抽屉 */}
      <Drawer title={`处理留言：${handling?.name ?? ''}`} width={420} open={handleOpen} onClose={() => setHandleOpen(false)}
        extra={<Space>
          <Button onClick={() => setHandleOpen(false)}>取消</Button>
          <Button type="primary" onClick={onHandle} style={{ background: '#B98A2F' }}>保存</Button>
        </Space>}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>目标状态：</div>
          <Select style={{ width: '100%' }} value={handleStatus} onChange={setHandleStatus}
            options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
        </div>
        <div style={{ marginBottom: 8 }}>处理备注：</div>
        <Input.TextArea rows={3} value={handleRemark} maxLength={500}
          placeholder="处理说明（≤500 字）" onChange={(e) => setHandleRemark(e.target.value)} />
      </Drawer>
    </Card>
  )
}
