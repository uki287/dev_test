// ============================================================
// 文件功能：产品系列管理页
// 功能：列表（封面/名称/描述/启用/排序）+ 新增/编辑 Drawer + 启停 + 软删。
// 权威依据：实施方案 Phase C（产品系列管理：CRUD + 启用停用 + 排序）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Space, Switch, Table, Upload, message,
} from 'antd'
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { createSeries, deleteSeries, getSeries, updateSeries, uploadFile } from '../../api'
import type { Series } from '../../api/types'

export default function SeriesList() {
  const [items, setItems] = useState<Series[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Series | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getSeries({ page: p, page_size: 20 })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openDrawer = (record?: Series) => {
    setEditing(record ?? null)
    setDrawerOpen(true)
    if (record) {
      form.setFieldsValue(record)
    } else {
      form.resetFields()
      form.setFieldsValue({ sort: 10, is_activate: 1 })
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const payload = {
      name: values.name,
      cover_image: values.cover_image ?? null,
      description: values.description ?? null,
      sort: values.sort ?? 0,
      is_activate: values.is_activate ? 1 : 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateSeries(editing.id, payload)
        message.success('更新成功')
      } else {
        await createSeries(payload)
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

  const onToggle = async (record: Series, checked: boolean) => {
    try {
      await updateSeries(record.id, { is_activate: checked ? 1 : 0 })
      message.success(checked ? '已启用' : '已停用')
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
      load()
    }
  }

  const onDelete = async (record: Series) => {
    try {
      await deleteSeries(record.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
      load()
    }
  }

  const columns: ColumnsType<Series> = [
    { title: '封面', dataIndex: 'cover_image', width: 120, render: (v) =>
      v ? <img src={v} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#bbb' }}>无</span> },
    { title: '系列名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '启用', dataIndex: 'is_activate', width: 80, render: (v: number, r) => (
      <Switch checked={v === 1} checkedChildren="启" unCheckedChildren="停" onChange={(c) => onToggle(r, c)} />
    )},
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '操作', width: 140, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)}>编辑</Button>
        <Popconfirm title="确定删除该系列？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="产品系列管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>新增系列</Button>}>
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      <Drawer
        title={editing ? '编辑产品系列' : '新增产品系列'}
        width={440}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Space>
          <Button onClick={() => setDrawerOpen(false)}>取消</Button>
          <Button type="primary" loading={saving} onClick={onSave} style={{ background: '#B98A2F' }}>保存</Button>
        </Space>}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="系列名称" rules={[{ required: true, message: '请输入系列名称' }]}>
            <Input placeholder="如：智能照明" maxLength={80} />
          </Form.Item>
          <Form.Item name="cover_image" label="封面图">
            <Upload maxCount={1} showUploadList={false} accept="image/*"
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const res = await uploadFile(file as File)
                  form.setFieldValue('cover_image', res.url)
                  onSuccess?.(res)
                } catch (e: any) {
                  onError?.(e)
                  message.error(e.message || '上传失败')
                }
              }}>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => getFieldValue('cover_image') ? (
                  <img src={getFieldValue('cover_image')} alt="" style={{ width: 120, height: 75, objectFit: 'cover', borderRadius: 8 }} />
                ) : <Button icon={<UploadOutlined />}>上传封面</Button>}
              </Form.Item>
            </Upload>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={500} placeholder="系列简介" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="sort" label="排序（小值在前）">
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
