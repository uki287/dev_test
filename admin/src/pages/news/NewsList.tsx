// ============================================================
// 文件功能：新闻管理页
// 功能：
//   - 筛选（行业/企业栏目、发布状态）+ 列表（封面/标题/栏目/状态/置顶/来源/排序）；
//   - 新增/编辑 Drawer：category、title、封面、摘要、正文（富文本 RichEditor，
//     支持图片上传）、来源、作者、置顶、排序、发布状态、发布时间、截止时间。
// 说明：富文本正文以 HTML 存储，图片上传接 /admin/upload（与产品管理同款组件）。
// 权威依据：实施方案 Phase C（新闻管理：draft/published/offline、置顶、封面、来源、截止时间）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space,
  Switch, Table, Tag, Upload, message,
} from 'antd'
import { PlusOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { createNews, deleteNews, getNews, updateNews, uploadFile } from '../../api'
import RichEditor from '../../components/RichEditor'
import type { News } from '../../api/types'

const CAT_MAP = { industry: { text: '行业资讯', color: 'blue' }, company: { text: '企业动态', color: 'purple' } }
const STATUS_MAP: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
}

export default function NewsList() {
  const [items, setItems] = useState<News[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<News | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageList, setImageList] = useState<string[]>([])
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ category?: string; pub_status?: string }>({})

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getNews({ page: p, page_size: 20, ...filters })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const openDrawer = (record?: News) => {
    setEditing(record ?? null)
    setDrawerOpen(true)
    if (record) {
      // 图集：优先 images，旧数据回退到 cover_image
      setImageList(record.images?.length ? [...record.images] : record.cover_image ? [record.cover_image] : [])
      form.setFieldsValue({
        ...record,
        published_at: record.published_at ? dayjs(record.published_at) : undefined,
        expired_at: record.expired_at ? dayjs(record.expired_at) : undefined,
      })
    } else {
      form.resetFields()
      setImageList([])
      form.setFieldsValue({ category: 'industry', pub_status: 'draft', sort: 10, is_top: false })
    }
  }

  // 多图操作：上移/下移/删除（与产品管理一致）
  const moveImage = (index: number, dir: -1 | 1) => {
    setImageList((list) => {
      const next = [...list]
      const j = index + dir
      if (j < 0 || j >= next.length) return list
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const payload: Partial<News> = {
      category: values.category,
      title: values.title,
      cover_image: imageList[0] ?? null, // 第一张自动作为封面
      images: imageList.length ? imageList : null,
      summary: values.summary ?? null,
      content: values.content ?? null,
      source: values.source ?? null,
      author: values.author ?? null,
      is_top: !!values.is_top,
      sort: values.sort ?? 0,
      pub_status: values.pub_status,
      published_at: values.published_at ? values.published_at.format('YYYY-MM-DDTHH:mm:ss') : null,
      expired_at: values.expired_at ? values.expired_at.format('YYYY-MM-DDTHH:mm:ss') : null,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateNews(editing.id, payload)
        message.success('更新成功')
      } else {
        await createNews(payload)
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

  const onDelete = async (record: News) => {
    try {
      await deleteNews(record.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<News> = [
    { title: '封面', dataIndex: 'cover_image', width: 120, render: (v) =>
      v ? <img src={v} alt="" style={{ width: 90, height: 50, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#bbb' }}>无</span> },
    { title: '标题', dataIndex: 'title', ellipsis: true, render: (v, r) => <span>{r.is_top ? '⭐ ' : ''}{v}</span> },
    { title: '栏目', dataIndex: 'category', width: 100, render: (v: keyof typeof CAT_MAP) => <Tag color={CAT_MAP[v]?.color}>{CAT_MAP[v]?.text ?? v}</Tag> },
    { title: '状态', dataIndex: 'pub_status', width: 90, render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.text ?? v}</Tag> },
    { title: '来源', dataIndex: 'source', width: 130, ellipsis: true },
    { title: '排序', dataIndex: 'sort', width: 60 },
    { title: '操作', width: 140, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)}>编辑</Button>
        <Popconfirm title="确定删除该新闻？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="新闻管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>新增新闻</Button>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="栏目" style={{ width: 140 }}
          options={Object.entries(CAT_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
          onChange={(v) => setFilters((f) => ({ ...f, category: v }))} />
        <Select allowClear placeholder="状态" style={{ width: 130 }}
          options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
          onChange={(v) => setFilters((f) => ({ ...f, pub_status: v }))} />
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      <Drawer
        title={editing ? '编辑新闻' : '新增新闻'}
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
            <Form.Item name="category" label="栏目" rules={[{ required: true }]} style={{ width: 180 }}>
              <Select options={Object.entries(CAT_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
            </Form.Item>
            <Form.Item name="pub_status" label="发布状态" rules={[{ required: true }]} style={{ width: 160 }}>
              <Select options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
            </Form.Item>
            <Form.Item name="is_top" label="置顶" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input maxLength={200} />
          </Form.Item>
          {/* 多图管理（与产品管理一致：上传/删除/上移下移，第一张为封面） */}
          <Form.Item label={`新闻图片（${imageList.length} 张，顺序即展示顺序，第一张为封面）`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {imageList.map((url, i) => (
                <Space key={url + i} style={{ display: 'flex', width: '100%', background: '#FAFAFA', padding: 6, borderRadius: 6 }}>
                  <img src={url} alt="" style={{ width: 90, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span>
                  <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => moveImage(i, -1)} />
                  <Button size="small" icon={<ArrowDownOutlined />} disabled={i === imageList.length - 1} onClick={() => moveImage(i, 1)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setImageList((l) => l.filter((_, j) => j !== i))} />
                </Space>
              ))}
              <Upload showUploadList={false} accept="image/*"
                customRequest={async ({ file, onSuccess, onError }) => {
                  setUploading(true)
                  try {
                    const res = await uploadFile(file as File)
                    setImageList((l) => [...l, res.url])
                    message.success('上传成功')
                    onSuccess?.(res)
                  } catch (e: any) {
                    onError?.(e)
                    message.error(e.message || '上传失败')
                  } finally {
                    setUploading(false)
                  }
                }}>
                <Button icon={<UploadOutlined />} loading={uploading}>上传图片</Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item name="content" label="正文（富文本，支持图片上传）">
            <RichEditor value={form.getFieldValue('content')} onChange={(html) => form.setFieldValue('content', html)} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="source" label="来源">
              <Input maxLength={200} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="author" label="作者">
              <Input maxLength={50} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="published_at" label="发布时间">
              <DatePicker showTime />
            </Form.Item>
            <Form.Item name="expired_at" label="截止时间">
              <DatePicker showTime />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
