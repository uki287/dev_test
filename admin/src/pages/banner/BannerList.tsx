// ============================================================
// 文件功能：轮播图管理页（★ 后台内容管理重中之重）
// 功能：
//   - 列表：缩略图 / 标题 / 链接 / 启用 Switch / 排序 / 起止时间 / 操作；
//   - 新增与编辑 Drawer（图片上传走 /admin/upload、link_url 主题联动、起止时间）；
//   - 预览 Modal（大图 + 链接展示）；删除软删 + 二次确认（Popconfirm）；
//   - 启用数 ≥1 校验由后端拦截（40300），前端透出后端 message；
//   - 停用 / 删除失败时刷新列表保持状态一致。
// 权威依据：实施方案 Phase C（★ 轮播图管理）+ PRD §6.4.1 / Dev §6.6。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Modal, Popconfirm,
  Space, Switch, Table, Upload, message,
} from 'antd'
import { PlusOutlined, UploadOutlined, SyncOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { createBanner, deleteBanner, getBanners, updateBanner, uploadFile } from '../../api'
import type { Banner } from '../../api/types'

export default function BannerList() {
  const [items, setItems] = useState<Banner[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [preview, setPreview] = useState<Banner | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imgBroken, setImgBroken] = useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)

  // 拉取列表（分页，page_size=20）
  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getBanners({ page: p, page_size: 20 })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  // 打开新增/编辑抽屉
  const openDrawer = (record?: Banner) => {
    setEditing(record ?? null)
    setImgBroken(false)
    setDrawerOpen(true)
    if (record) {
      form.setFieldsValue({
        ...record,
        timeRange:
          record.start_at || record.end_at
            ? [record.start_at ? dayjs(record.start_at) : null, record.end_at ? dayjs(record.end_at) : null]
            : undefined,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ sort: 10, is_activate: 1 })
    }
  }

  // 保存（新增或编辑）
  const onSave = async () => {
    const values = await form.validateFields()
    const payload: Partial<Banner> = {
      title: values.title ?? null,
      image: values.image,
      link_url: values.link_url ?? null,
      sort: values.sort ?? 0,
      is_activate: values.is_activate ? 1 : 0,
      start_at: values.timeRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss') ?? null,
      end_at: values.timeRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss') ?? null,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateBanner(editing.id, payload)
        message.success('更新成功')
      } else {
        await createBanner(payload)
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

  // 启停切换（停用触发后端启用数校验）
  const onToggle = async (record: Banner, checked: boolean) => {
    try {
      await updateBanner(record.id, { is_activate: checked ? 1 : 0 })
      message.success(checked ? '已启用' : '已停用')
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
      load() // 失败后刷新，恢复真实状态
    }
  }

  // 删除（软删 + 二次确认）
  const onDelete = async (record: Banner) => {
    try {
      await deleteBanner(record.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
      load()
    }
  }

  const columns: ColumnsType<Banner> = [
    { title: '预览', dataIndex: 'image', width: 150, render: (v: string, r) => (
      <img src={v} alt={r.title || '轮播'} style={{ width: 120, height: 45, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} onClick={() => setPreview(r)} />
    )},
    { title: '标题', dataIndex: 'title', render: (v) => v || <span style={{ color: '#bbb' }}>（无标题）</span> },
    { title: '跳转链接', dataIndex: 'link_url', render: (v) => v || '-' },
    { title: '启用', dataIndex: 'is_activate', width: 80, render: (v: number, r) => (
      <Switch checked={v === 1} checkedChildren="启" unCheckedChildren="停" onChange={(c) => onToggle(r, c)} />
    )},
    { title: '排序', dataIndex: 'sort', width: 80 },
    { title: '起止时间', width: 200, render: (_, r) => (
      <span style={{ fontSize: 12, color: '#888' }}>
        {r.start_at ? dayjs(r.start_at).format('YYYY-MM-DD') : '不限'} ~ {r.end_at ? dayjs(r.end_at).format('YYYY-MM-DD') : '不限'}
      </span>
    )},
    { title: '操作', width: 200, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(r)}>预览</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)}>编辑</Button>
        <Popconfirm title="确定删除该轮播图？" description="删除后前台不再展示" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card
      title="轮播图管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>新增轮播图</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />

      {/* 新增 / 编辑抽屉 */}
      <Drawer
        title={editing ? '编辑轮播图' : '新增轮播图'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={onSave} style={{ background: '#B98A2F' }}>保存</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="image" label="轮播图片（建议 1600×600）" rules={[{ required: true, message: '请上传图片' }]}>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const img = getFieldValue('image')
                return (
                  <Upload
                    maxCount={1}
                    showUploadList={false}
                    accept="image/*"
                    customRequest={async ({ file, onSuccess, onError }) => {
                      setUploading(true)
                      try {
                        const res = await uploadFile(file as File)
                        form.setFieldValue('image', res.url)
                        setImgBroken(false)
                        message.success('上传成功')
                        onSuccess?.(res)
                      } catch (e: any) {
                        onError?.(e)
                        message.error(e.message || '上传失败')
                      } finally {
                        setUploading(false)
                      }
                    }}
                  >
                    <div>
                      {img && (
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                          {imgBroken ? (
                            <div style={{ width: '100%', height: 120, borderRadius: 8, background: '#FAFAFA', border: '1px dashed #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                              原图缺失或加载失败，请点击下方按钮重新上传
                            </div>
                          ) : (
                            <img
                              src={img}
                              alt="预览"
                              onError={() => setImgBroken(true)}
                              style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                            />
                          )}
                        </div>
                      )}
                      <Button
                        icon={img ? <SyncOutlined /> : <UploadOutlined />}
                        loading={uploading}
                        block
                      >
                        {img ? '更换图片' : '上传图片'}
                      </Button>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>点击上方图片或按钮选择本地图片（jpg / png / webp / gif，≤5MB）</div>
                    </div>
                  </Upload>
                )
              }}
            </Form.Item>
          </Form.Item>
          <Form.Item name="title" label="标题（选填）">
            <Input placeholder="如：智享未来家" maxLength={120} />
          </Form.Item>
          <Form.Item name="link_url" label="跳转链接（主题联动）" tooltip="支持 / 或 /products?series=xxx">
            <Input placeholder="/products?series=lighting" maxLength={512} />
          </Form.Item>
          <Form.Item name="timeRange" label="起止时间（选填，空=长期展示）">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="sort" label="排序（小值在前）">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="is_activate" label="立即启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>

      {/* 预览 Modal */}
      <Modal
        open={!!preview}
        title={preview?.title || '轮播图预览'}
        footer={null}
        onCancel={() => setPreview(null)}
        width={860}
      >
        {preview && (
          <div>
            <img src={preview.image} alt={preview.title || '轮播'} style={{ width: '100%', borderRadius: 8 }} />
            {preview.link_url && (
              <div style={{ marginTop: 12, color: '#888' }}>跳转链接：{preview.link_url}</div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  )
}
