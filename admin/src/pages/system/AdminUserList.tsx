// ============================================================
// 文件功能：管理员管理页（Phase D）
// 功能：列表 / 新增（初始密码）/ 编辑（角色·启停）/ 重置密码 / 删除。
// 保护规则（PRD §6.7.1）：不可删/停用自己、不可删/停用最后一个超管（后端拦截并提示）。
// 权威依据：实施方案 Phase D（管理员管理）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { createUser, deleteUser, getRoles, getUsers, resetUserPassword, updateUser } from '../../api'
import type { AdminUser, Role } from '../../api/types'
import { useAuth } from '../../store/auth'

export default function AdminUserList() {
  const me = useAuth((s) => s.user)
  const [items, setItems] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [pwdTarget, setPwdTarget] = useState<AdminUser | null>(null)
  const [form] = Form.useForm()
  const [pwdForm] = Form.useForm()

  const load = useCallback(async (p: number = page) => {
    setLoading(true)
    try {
      const data = await getUsers({ page: p, page_size: 20, keyword: keyword || undefined })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => { load() }, [load])
  useEffect(() => { getRoles().then(setRoles).catch(() => undefined) }, [])

  const openModal = (record?: AdminUser) => {
    setEditing(record ?? null)
    setModalOpen(true)
    if (record) {
      form.setFieldsValue({ cn_name: record.cn_name, role_id: record.role_id, is_activate: record.is_activate })
    } else {
      form.resetFields()
      form.setFieldsValue({ is_activate: 1 })
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) {
        await updateUser(editing.id, { cn_name: values.cn_name ?? null, role_id: values.role_id ?? null, is_activate: values.is_activate ? 1 : 0 })
        message.success('更新成功')
      } else {
        await createUser({ username: values.username, password: values.password, cn_name: values.cn_name ?? null, role_id: values.role_id ?? null, is_activate: 1 })
        message.success('新增成功（用户下次登录需改密）')
      }
      setModalOpen(false)
      load(editing ? page : 1)
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onResetPwd = async () => {
    const values = await pwdForm.validateFields()
    if (!pwdTarget) return
    try {
      await resetUserPassword(pwdTarget.id, values.new_password)
      message.success('密码已重置，用户下次登录需改密')
      setPwdTarget(null)
      pwdForm.resetFields()
    } catch (e: any) {
      message.error(e.message || '重置失败')
    }
  }

  const onToggle = async (r: AdminUser, checked: boolean) => {
    try {
      await updateUser(r.id, { is_activate: checked ? 1 : 0 })
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
      load()
    }
  }

  const onDelete = async (r: AdminUser) => {
    try {
      await deleteUser(r.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<AdminUser> = [
    { title: '用户名', dataIndex: 'username', render: (v) => <strong>{v}</strong> },
    { title: '中文名', dataIndex: 'cn_name', render: (v) => v || '-' },
    { title: '角色', dataIndex: 'role_name', render: (v) => (v ? <Tag color="gold">{v}</Tag> : '-') },
    { title: '强制改密', dataIndex: 'force_pwd', width: 90, render: (v) => (v ? <Tag color="orange">待改密</Tag> : '-') },
    { title: '状态', dataIndex: 'is_activate', width: 80, render: (v: number, r) => (
      <Switch checked={v === 1} checkedChildren="启" unCheckedChildren="停" disabled={r.username === me?.username} onChange={(c) => onToggle(r, c)} />
    )},
    { title: '操作', width: 230, render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
        <Button size="small" icon={<KeyOutlined />} onClick={() => { setPwdTarget(r); pwdForm.resetFields() }}>重置密码</Button>
        <Popconfirm title="确定删除该管理员？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={r.username === me?.username}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="管理员管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增管理员</Button>}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="用户名/中文名搜索" style={{ width: 220 }} onSearch={(v) => { setKeyword(v); setPage(1) }} />
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
        pagination={{ current: page, pageSize: 20, total, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }} />

      {/* 新增 / 编辑 */}
      <Modal title={editing ? '编辑管理员' : '新增管理员'} open={modalOpen} onOk={onSave} confirmLoading={saving} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {!editing && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }, { min: 2, max: 50, message: '2-50 字符' }]}>
                <Input maxLength={50} placeholder="登录名（唯一）" />
              </Form.Item>
              <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }, { min: 6, message: '至少 6 位' }]}>
                <Input.Password maxLength={64} placeholder="≥6 位，用户首次登录需改密" />
              </Form.Item>
            </>
          )}
          <Form.Item name="cn_name" label="中文名">
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="role_id" label="角色">
            <Select allowClear placeholder="选择角色" options={roles.map((r) => ({ label: `${r.name}（${r.code}）`, value: r.id }))} />
          </Form.Item>
          {editing && (
            <Form.Item name="is_activate" label="启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码 */}
      <Modal title={`重置密码：${pwdTarget?.username ?? ''}`} open={!!pwdTarget} onOk={onResetPwd} onCancel={() => setPwdTarget(null)} okText="重置" cancelText="取消">
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少 6 位' }]}>
            <Input.Password maxLength={64} placeholder="≥6 位，重置后用户首次登录需改密" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
