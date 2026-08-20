// ============================================================
// 文件功能：关于管理页（8 tab 内容维护）
// Tab 划分：
//   公司简介（company_intro，即"关于我们" D1）/ 品牌介绍（brand_intro）/
//   资质荣誉（honors，首次保存自动建页）/ 在线预约说明（appointment_notice）
//   → 通用「内容编辑器」：title + blocks 段落（h 标题 / p 正文）动态增删；
//   发展历程（history）/ 品牌历程（brand_history）→ 时间轴编辑器（增删改排序）；
//   联系方式（company_info）→ 键值编辑器。
// 权威依据：实施方案 Phase C（关于管理 8 tab + 联系方式共用 company_info）+ D1。
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tabs, Tag, message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  createCompanyInfo, createTimeline, deleteTimeline, getAboutPages, getCompanyInfo,
  getTimeline, updateAboutPage, updateCompanyInfo, updateTimeline,
} from '../../api'
import type { CompanyInfo, Timeline } from '../../api/types'

// ---------- 通用内容编辑器（tab 1-4） ----------
function ContentEditor({ pageKey, title }: { pageKey: string; title: string }) {
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    getAboutPages()
      .then((pages) => {
        const found = pages.find((p) => p.page_key === pageKey)
        const content = (found?.content ?? {}) as { title?: string; blocks?: { h?: string; p?: string }[] }
        form.setFieldsValue({
          title: content.title ?? '',
          blocks: content.blocks?.length ? content.blocks : [{ h: '', p: '' }],
        })
      })
      .catch((e: any) => message.error(e.message || '加载失败'))
  }, [pageKey, form])

  const onSave = async () => {
    const values = await form.validateFields()
    const blocks = (values.blocks ?? [])
      .filter((b: { h?: string; p?: string }) => b.h || b.p)
      .map((b: { h?: string; p?: string }) => ({ h: b.h ?? '', p: b.p ?? '' }))
    setSaving(true)
    try {
      await updateAboutPage(pageKey, { title: values.title ?? '', blocks })
      message.success('已保存')
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title={title}
      extra={<Button type="primary" loading={saving} onClick={onSave} style={{ background: '#B98A2F' }}>保存</Button>}
      style={{ maxWidth: 760 }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="页面标题">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="内容段落（标题 + 正文）">
          <Form.List name="blocks">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Form.Item name={[f.name, 'h']} style={{ width: 220, marginBottom: 0 }}>
                      <Input placeholder="段落标题（h）" />
                    </Form.Item>
                    <Form.Item name={[f.name, 'p']} style={{ flex: 1, marginBottom: 0 }}>
                      <Input.TextArea rows={2} placeholder="段落正文（p）" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(f.name)} style={{ color: '#ff4d4f', marginTop: 8 }} />
                  </div>
                ))}
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({ h: '', p: '' })}>
                  添加段落
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Card>
  )
}

// ---------- 时间轴编辑器（tab 5-6） ----------
function TimelineEditor({ type, title }: { type: 'history' | 'brand_history'; title: string }) {
  const [items, setItems] = useState<Timeline[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Timeline | null>(null)
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getTimeline(type)
      .then(setItems)
      .catch((e: any) => message.error(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [type])

  useEffect(() => { load() }, [load])

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateTimeline(editing.id, values)
        message.success('更新成功')
      } else {
        await createTimeline({ ...values, type })
        message.success('新增成功')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message || '保存失败')
    }
  }

  const onDelete = async (record: Timeline) => {
    try {
      await deleteTimeline(record.id)
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<Timeline> = [
    { title: '年份', dataIndex: 'year', width: 130 },
    { title: '事件', dataIndex: 'title' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '操作', width: 150, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true) }}>编辑</Button>
        <Popconfirm title="确定删除该条目？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title={title} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ year: '', title: '', sort: 10 }); setOpen(true) }}>新增条目</Button>} style={{ maxWidth: 760 }}>
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={false} size="small" />

      {/* 新增/编辑弹窗（Modal 承载表单，避免多 Form 同实例） */}
      <Modal
        title={editing ? '编辑条目' : '新增条目'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="year" label="年份" rules={[{ required: true, message: '年份必填' }]}>
              <Input placeholder="如 2018 / 2018至今" maxLength={20} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="title" label="事件标题" rules={[{ required: true, message: '标题必填' }]}>
              <Input maxLength={200} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <Input type="number" style={{ width: 90 }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

// ---------- 联系方式编辑器（tab 7） ----------
function CompanyEditor() {
  const [items, setItems] = useState<CompanyInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CompanyInfo | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getCompanyInfo().then(setItems).catch(() => undefined).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateCompanyInfo(editing.id, { info_value: values.info_value ?? '', remark: values.remark ?? '' })
      } else {
        await createCompanyInfo({ info_key: values.info_key, info_value: values.info_value ?? '', remark: values.remark ?? '' })
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message || '保存失败')
    }
  }

  const columns: ColumnsType<CompanyInfo> = [
    { title: '键', dataIndex: 'info_key', width: 180, render: (v) => <Tag color="gold">{v}</Tag> },
    { title: '值', dataIndex: 'info_value' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '操作', width: 100, render: (_, r) => (
      <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }}>编辑</Button>
    )},
  ]

  return (
    <Card title="联系方式（全站页脚/联系页共用）" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true) }}>新增</Button>} style={{ maxWidth: 760 }}>
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={false} size="small" />
      <Modal title={editing ? '编辑信息' : '新增信息'} open={modalOpen} onOk={onSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {!editing && (
            <Form.Item name="info_key" label="键（如 address / phone / email）" rules={[{ required: true, message: '键必填' }]}>
              <Input maxLength={50} />
            </Form.Item>
          )}
          <Form.Item name="info_value" label="值" rules={[{ required: true, message: '值必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

// ---------- 页面主组件 ----------
export default function AboutManage() {
  const tabs = useMemo(() => [
    { key: 'company_intro', label: '公司简介', children: <ContentEditor pageKey="company_intro" title="公司简介（关于我们）" /> },
    { key: 'brand_intro', label: '品牌介绍', children: <ContentEditor pageKey="brand_intro" title="品牌介绍" /> },
    { key: 'honors', label: '资质荣誉', children: <ContentEditor pageKey="honors" title="资质荣誉" /> },
    { key: 'appointment_notice', label: '在线预约说明', children: <ContentEditor pageKey="appointment_notice" title="在线预约说明" /> },
    { key: 'history', label: '发展历程', children: <TimelineEditor type="history" title="发展历程（时间轴）" /> },
    { key: 'brand_history', label: '品牌历程', children: <TimelineEditor type="brand_history" title="品牌历程（时间轴）" /> },
    { key: 'company', label: '联系方式', children: <CompanyEditor /> },
  ], [])

  return <Card title="关于管理"><Tabs defaultActiveKey="company_intro" items={tabs} /></Card>
}
