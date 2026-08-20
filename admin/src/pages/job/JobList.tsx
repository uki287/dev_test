// ============================================================
// 文件功能：招聘管理页
// 功能：
//   - 筛选（行业/校园）+ 列表（岗位/栏目/人数/地点/投递邮箱/启用/排序/操作）；
//   - 新增/编辑 Drawer：category、title、count、location、salary_desc、
//     职责（HTML 富文本）、要求（HTML 富文本）、email、sort、启用；
//   - 复制（后端生成副本）、软删（二次确认）。
// 权威依据：实施方案 Phase C（招聘管理：行业/校园分类、富文本职责/要求、投递邮箱、启停、复制）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { createJob, deleteJob, duplicateJob, getJobs, updateJob } from '../../api'
import type { Job } from '../../api/types'

const CAT_MAP = { industry: { text: '社会招聘', color: 'blue' }, campus: { text: '校园招聘', color: 'green' } }

export default function JobList() {
  const [items, setItems] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<string>()

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getJobs({ page: p, page_size: 20, category })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, category])

  useEffect(() => { load() }, [load])

  const openDrawer = (record?: Job) => {
    setEditing(record ?? null)
    setDrawerOpen(true)
    if (record) {
      form.setFieldsValue(record)
    } else {
      form.resetFields()
      form.setFieldsValue({ category: 'industry', sort: 10, is_activate: 1 })
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const payload: Partial<Job> = {
      category: values.category,
      title: values.title,
      count: values.count ?? null,
      location: values.location ?? null,
      salary_desc: values.salary_desc ?? null,
      duty: values.duty ?? null,
      requirement: values.requirement ?? null,
      email: values.email ?? null,
      sort: values.sort ?? 0,
      is_activate: values.is_activate ? 1 : 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateJob(editing.id, payload)
        message.success('更新成功')
      } else {
        await createJob(payload)
        message.success('新增成功')
      }
      setDrawerOpen(false)
      load(editing ? page : 1)
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onToggle = async (record: Job, checked: boolean) => {
    try {
      await updateJob(record.id, { is_activate: checked ? 1 : 0 })
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
      load()
    }
  }

  const onDuplicate = async (record: Job) => {
    try {
      await duplicateJob(record.id)
      message.success('已生成副本')
      load(1)
    } catch (e: any) {
      message.error(e.message || '复制失败')
    }
  }

  const onDelete = async (record: Job) => {
    try {
      await deleteJob(record.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<Job> = [
    { title: '岗位名称', dataIndex: 'title' },
    { title: '栏目', dataIndex: 'category', width: 110, render: (v: keyof typeof CAT_MAP) => <Tag color={CAT_MAP[v]?.color}>{CAT_MAP[v]?.text ?? v}</Tag> },
    { title: '人数', dataIndex: 'count', width: 70, render: (v) => v ?? '-' },
    { title: '地点', dataIndex: 'location', width: 110 },
    { title: '投递邮箱', dataIndex: 'email', width: 180 },
    { title: '启用', dataIndex: 'is_activate', width: 80, render: (v: number, r) => (
      <Switch checked={v === 1} checkedChildren="启" unCheckedChildren="停" onChange={(c) => onToggle(r, c)} />
    )},
    { title: '操作', width: 200, render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)}>编辑</Button>
        <Button size="small" icon={<CopyOutlined />} onClick={() => onDuplicate(r)}>复制</Button>
        <Popconfirm title="确定删除该岗位？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="招聘管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>新增岗位</Button>}>
      <Select allowClear placeholder="栏目筛选" style={{ width: 150, marginBottom: 16 }}
        options={Object.entries(CAT_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
        onChange={(v) => setCategory(v)} />

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      <Drawer
        title={editing ? '编辑岗位' : '新增岗位'}
        width={620}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Space>
          <Button onClick={() => setDrawerOpen(false)}>取消</Button>
          <Button type="primary" loading={saving} onClick={onSave} style={{ background: '#B98A2F' }}>保存</Button>
        </Space>}
      >
        <Form form={form} layout="vertical">
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="category" label="招聘类型" rules={[{ required: true }]} style={{ width: 180 }}>
              <Select options={Object.entries(CAT_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
            </Form.Item>
            <Form.Item name="title" label="岗位名称" rules={[{ required: true, message: '请输入岗位名称' }]} style={{ flex: 1 }}>
              <Input maxLength={120} />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="count" label="招聘人数">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="location" label="工作地点">
              <Input maxLength={120} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="salary_desc" label="薪资说明">
              <Input maxLength={255} style={{ width: 180 }} placeholder="如：15-25K·14薪" />
            </Form.Item>
          </Space>
          <Form.Item name="email" label="投递邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input maxLength={120} placeholder="hr@tp-smart.com" />
          </Form.Item>
          <Form.Item name="duty" label="岗位职责（HTML 富文本）">
            <Input.TextArea rows={5} placeholder="<ul><li>职责一…</li></ul>" />
          </Form.Item>
          <Form.Item name="requirement" label="任职要求（HTML 富文本）">
            <Input.TextArea rows={5} placeholder="<ul><li>要求一…</li></ul>" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="is_activate" label="启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
