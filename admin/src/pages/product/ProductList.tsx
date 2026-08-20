// ============================================================
// 文件功能：产品管理页
// 功能：
//   - 筛选（系列 / 状态 / 关键字）+ 批量上下架（选中行）；
//   - 列表：封面 / 名称 / 编号 / 系列 / 状态 / 首页推荐 Switch / 排序 / 操作；
//   - 新增/编辑 Drawer：
//       spec 结构化键值（Form.List 动态增删行，提交转 JSON 对象）；
//       images 多图（上传/删除/上移下移调整顺序）；
//       related_products 搭配多选（排除自身，非空时 2-4 个，后端二次校验）；
//       pub_status / is_top / price_desc / description；
//   - 复制（后端生成独立副本）、软删（二次确认）。
// 权威依据：实施方案 Phase C（产品管理：spec/images/related/批量/复制/软删）。
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space,
  Switch, Table, Tag, Upload, message,
} from 'antd'
import {
  PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined, CopyOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusCircleOutlined, SyncOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  batchProductStatus, createProduct, deleteProduct, duplicateProduct, getProducts,
  getSeries, updateProduct, uploadFile,
} from '../../api'
import RichEditor from '../../components/RichEditor'
import type { Product, Series } from '../../api/types'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  on_shelf: { text: '已上架', color: 'green' },
  off_shelf: { text: '已下架', color: 'orange' },
  draft: { text: '草稿', color: 'default' },
}

export default function ProductList() {
  const [items, setItems] = useState<Product[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ series_id?: number; pub_status?: string; keyword?: string }>({})
  // 多图本地状态（独立于表单，便于排序/删除）
  const [imageList, setImageList] = useState<string[]>([])
  // 封面图上传状态（独立单图，见"封面图"表单区）
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverBroken, setCoverBroken] = useState(false)

  // 拉取系列选项（全部，供筛选与表单下拉）
  useEffect(() => {
    getSeries({ page: 1, page_size: 50 }).then((d) => setSeriesList(d.items)).catch(() => undefined)
  }, [])

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getProducts({ page: p, page_size: 20, ...filters })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  // 系列名映射
  const seriesName = useMemo(() => {
    const m: Record<number, string> = {}
    seriesList.forEach((s) => { m[s.id] = s.name })
    return m
  }, [seriesList])

  // 搭配产品选项（当前列表，排除编辑中的自身）
  const relatedOptions = useMemo(
    () => items.filter((p) => p.id !== editing?.id).map((p) => ({ label: `${p.name} (${p.product_code})`, value: p.id })),
    [items, editing],
  )

  const openDrawer = (record?: Product) => {
    setEditing(record ?? null)
    setCoverBroken(false)
    setDrawerOpen(true)
    if (record) {
      // spec 对象 → Form.List 键值对
      const specList = Object.entries(record.spec ?? {}).map(([k, v]) => ({ k, v: String(v) }))
      form.setFieldsValue({ ...record, specList })
      setImageList(record.images ?? [])
    } else {
      form.resetFields()
      form.setFieldsValue({ sort: 10, pub_status: 'draft', is_top: false, specList: [{ k: '', v: '' }] })
      setImageList([])
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    // spec 键值对 → JSON 对象（过滤空键）
    const spec: Record<string, string> = {}
    ;(values.specList ?? []).forEach((row: { k?: string; v?: string }) => {
      if (row.k && row.k.trim()) spec[row.k.trim()] = row.v ?? ''
    })
    const payload: Partial<Product> = {
      name: values.name,
      product_code: values.product_code,
      series_id: values.series_id ?? null,
      price_desc: values.price_desc ?? null,
      description: values.description ?? null,
      spec: Object.keys(spec).length ? spec : null,
      cover_image: values.cover_image ?? imageList[0] ?? null, // 封面独立设置；未设置时回退图集第一张
      images: imageList.length ? imageList : null,
      related_products: values.related_products ?? [],
      pub_status: values.pub_status,
      is_top: !!values.is_top,
      sort: values.sort ?? 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateProduct(editing.id, payload)
        message.success('更新成功')
      } else {
        await createProduct(payload)
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

  // 批量上下架
  const onBatchStatus = async (status: 'on_shelf' | 'off_shelf') => {
    if (!selected.length) {
      message.warning('请先勾选产品')
      return
    }
    try {
      await batchProductStatus(selected, status)
      message.success(status === 'on_shelf' ? '已批量上架' : '已批量下架')
      setSelected([])
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  // 复制
  const onDuplicate = async (record: Product) => {
    try {
      await duplicateProduct(record.id)
      message.success('已生成副本')
      load(1)
    } catch (e: any) {
      message.error(e.message || '复制失败')
    }
  }

  // 删除
  const onDelete = async (record: Product) => {
    try {
      await deleteProduct(record.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  // 多图操作：上移/下移/删除
  const moveImage = (index: number, dir: -1 | 1) => {
    setImageList((list) => {
      const next = [...list]
      const j = index + dir
      if (j < 0 || j >= next.length) return list
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const columns: ColumnsType<Product> = [
    { title: '封面', dataIndex: 'cover_image', width: 110, render: (v) =>
      v ? <img src={v} alt="" style={{ width: 70, height: 50, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#bbb' }}>无</span> },
    { title: '产品名称', dataIndex: 'name', ellipsis: true },
    { title: '编号', dataIndex: 'product_code', width: 130 },
    { title: '系列', dataIndex: 'series_id', width: 110, render: (v: number | null) => (v ? seriesName[v] ?? '-' : '-') },
    { title: '状态', dataIndex: 'pub_status', width: 90, render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.text ?? v}</Tag> },
    { title: '首页推荐', dataIndex: 'is_top', width: 90, render: (v: boolean, r) => (
      <Switch size="small" checked={v} onChange={async (c) => {
        try { await updateProduct(r.id, { is_top: c }); load() } catch (e: any) { message.error(e.message) }
      }} />
    )},
    { title: '排序', dataIndex: 'sort', width: 60 },
    { title: '操作', width: 230, render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)}>编辑</Button>
        <Button size="small" icon={<CopyOutlined />} onClick={() => onDuplicate(r)}>复制</Button>
        <Popconfirm title="确定删除该产品？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="产品管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>新增产品</Button>}>
      {/* 筛选 + 批量操作区 */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear placeholder="系列" style={{ width: 160 }}
          options={seriesList.map((s) => ({ label: s.name, value: s.id }))}
          onChange={(v) => setFilters((f) => ({ ...f, series_id: v }))}
        />
        <Select
          allowClear placeholder="状态" style={{ width: 130 }}
          options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))}
          onChange={(v) => setFilters((f) => ({ ...f, pub_status: v }))}
        />
        <Input.Search allowClear placeholder="名称/编号搜索" style={{ width: 220 }} onSearch={(v) => setFilters((f) => ({ ...f, keyword: v || undefined }))} />
        <Button onClick={onBatchStatus.bind(null, 'on_shelf')}>批量上架</Button>
        <Button onClick={onBatchStatus.bind(null, 'off_shelf')}>批量下架</Button>
        {selected.length > 0 && <Tag color="gold">已选 {selected.length} 项</Tag>}
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }}
      />

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editing ? '编辑产品' : '新增产品'}
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
            <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入名称' }]} style={{ flex: 1 }}>
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item name="product_code" label="产品编号" rules={[{ required: true, message: '请输入编号' }]} style={{ flex: 1 }}>
              <Input maxLength={64} placeholder="唯一，如 TP-CL-001" />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="series_id" label="所属系列">
              <Select allowClear style={{ width: 200 }} options={seriesList.map((s) => ({ label: s.name, value: s.id }))} />
            </Form.Item>
            <Form.Item name="pub_status" label="发布状态" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={Object.entries(STATUS_MAP).map(([v, m]) => ({ label: m.text, value: v }))} />
            </Form.Item>
            <Form.Item name="is_top" label="首页推荐" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="price_desc" label="价格说明">
            <Input maxLength={255} placeholder="如：价格面议，欢迎咨询" />
          </Form.Item>
          <Form.Item name="description" label="产品描述（富文本，支持图片上传）">
            <RichEditor value={form.getFieldValue('description')} onChange={(html) => form.setFieldValue('description', html)} />
          </Form.Item>

          {/* spec 结构化键值（动态增删行） */}
          <Form.Item label="规格参数（结构化键值，可自定义扩展项）">
            <Form.List name="specList">
              {(fields, { add, remove }) => (
                <div>
                  {fields.map((f) => (
                    <Space key={f.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item name={[f.name, 'k']} noStyle rules={[{ required: true, message: '键' }]}>
                        <Input placeholder="参数名，如 材质" style={{ width: 160 }} />
                      </Form.Item>
                      <Form.Item name={[f.name, 'v']} noStyle>
                        <Input placeholder="参数值，如 铝合金" style={{ width: 260 }} />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(f.name)} style={{ color: '#ff4d4f' }} />
                    </Space>
                  ))}
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({ k: '', v: '' })}>
                    添加参数项
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          {/* 独立封面图（单图）：列表/首页展示用，可与产品图分开设置 */}
          <Form.Item name="cover_image" label="封面图（单图，列表与首页展示）">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }) => {
                const cover = getFieldValue('cover_image')
                return (
                  <Upload
                    maxCount={1}
                    showUploadList={false}
                    accept="image/*"
                    customRequest={async ({ file, onSuccess, onError }) => {
                      setCoverUploading(true)
                      try {
                        const res = await uploadFile(file as File)
                        setFieldValue('cover_image', res.url)
                        setCoverBroken(false)
                        message.success('封面上传成功')
                        onSuccess?.(res)
                      } catch (e: any) {
                        onError?.(e)
                        message.error(e.message || '上传失败')
                      } finally {
                        setCoverUploading(false)
                      }
                    }}
                  >
                    <div>
                      {cover && (
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                          {coverBroken ? (
                            <div style={{ width: 220, height: 140, borderRadius: 8, background: '#FAFAFA', border: '1px dashed #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                              封面缺失或加载失败，请重新上传
                            </div>
                          ) : (
                            <img
                              src={cover}
                              alt="封面预览"
                              onError={() => setCoverBroken(true)}
                              style={{ width: 220, height: 140, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                            />
                          )}
                        </div>
                      )}
                      <Space>
                        <Button icon={cover ? <SyncOutlined /> : <UploadOutlined />} loading={coverUploading}>
                          {cover ? '更换封面' : '上传封面'}
                        </Button>
                        {cover && (
                          <Button size="small" danger onClick={() => setFieldValue('cover_image', null)}>
                            移除封面
                          </Button>
                        )}
                      </Space>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>未设置时自动使用产品图第一张</div>
                    </div>
                  </Upload>
                )
              }}
            </Form.Item>
          </Form.Item>

          {/* 多图管理（上传/删除/上移下移） */}
          <Form.Item label={`产品图片（${imageList.length} 张，顺序即展示顺序）`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {imageList.map((url, i) => (
                <Space key={url + i} style={{ display: 'flex', width: '100%', background: '#FAFAFA', padding: 6, borderRadius: 6 }}>
                  <img src={url} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span>
                  <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => moveImage(i, -1)} />
                  <Button size="small" icon={<ArrowDownOutlined />} disabled={i === imageList.length - 1} onClick={() => moveImage(i, 1)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setImageList((l) => l.filter((_, j) => j !== i))} />
                </Space>
              ))}
              <Upload showUploadList={false} accept="image/*"
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    const res = await uploadFile(file as File)
                    setImageList((l) => [...l, res.url])
                    onSuccess?.(res)
                  } catch (e: any) {
                    onError?.(e)
                    message.error(e.message || '上传失败')
                  }
                }}>
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
            </Space>
          </Form.Item>

          {/* 搭配产品（2-4 个，排除自身） */}
          <Form.Item name="related_products" label="搭配使用（选填，非空时 2-4 个）" tooltip="勾选可搭配推荐的产品">
            <Select mode="multiple" allowClear placeholder="选择搭配产品" options={relatedOptions} />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  )
}
