// ============================================================
// 文件功能：角色管理页（Phase D，RBAC 树）
// 功能：角色列表 / 新增 / 编辑（权限树勾选，Tree checkable）/ 启停 / 删除。
// 权威依据：实施方案 Phase D（角色管理 RBAC 树：角色 CRUD、权限树勾选、启用停用）。
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Tree, message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { createRole, deleteRole, getPermTree, getRoles, updateRole } from '../../api'
import type { PermNode, Role } from '../../api/types'

// 权限树 → AntD Tree 数据（key 用权限码）
const toTreeData = (nodes: PermNode[]): any[] =>
  nodes.map((n) => ({
    key: n.code,
    title: `${n.name}（${n.code}）`,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }))

export default function RoleList() {
  const [items, setItems] = useState<Role[]>([])
  const [treeData, setTreeData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [saving, setSaving] = useState(false)
  const [checkedCodes, setCheckedCodes] = useState<string[]>([])
  const [form] = Form.useForm()

  const load = useCallback(() => {
    setLoading(true)
    getRoles()
      .then(setItems)
      .catch((e: any) => message.error(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    getPermTree().then((d) => setTreeData(toTreeData(d.tree))).catch(() => undefined)
  }, [])

  const openModal = (record?: Role) => {
    setEditing(record ?? null)
    setModalOpen(true)
    if (record) {
      form.setFieldsValue({ name: record.name, description: record.description, is_activate: record.is_activate })
      setCheckedCodes(record.perms)
    } else {
      form.resetFields()
      form.setFieldsValue({ is_activate: 1 })
      setCheckedCodes([])
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) {
        await updateRole(editing.id, { name: values.name, description: values.description ?? null, perms: checkedCodes, is_activate: values.is_activate ? 1 : 0 })
        message.success('更新成功')
      } else {
        await createRole({ code: values.code, name: values.name, description: values.description ?? null, perms: checkedCodes, is_activate: 1 })
        message.success('新增成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onToggle = async (r: Role, checked: boolean) => {
    try {
      await updateRole(r.id, { is_activate: checked ? 1 : 0 })
      load()
    } catch (e: any) {
      message.error(e.message || '操作失败')
      load()
    }
  }

  const onDelete = async (r: Role) => {
    try {
      await deleteRole(r.id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const columns: ColumnsType<Role> = [
    { title: '角色编码', dataIndex: 'code', render: (v) => <Tag color="gold">{v}</Tag> },
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    { title: '权限数', dataIndex: 'perms', width: 80, render: (v: string[]) => v.length },
    { title: '状态', dataIndex: 'is_activate', width: 80, render: (v: number, r) => (
      <Switch checked={v === 1} checkedChildren="启" unCheckedChildren="停" onChange={(c) => onToggle(r, c)} />
    )},
    { title: '操作', width: 140, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
        <Popconfirm title="确定删除该角色？" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <Card title="角色管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增角色</Button>}>
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={false} />

      <Modal
        title={editing ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onOk={onSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {!editing && (
            <Form.Item name="code" label="角色编码" rules={[{ required: true, message: '请输入编码' }, { min: 2, max: 50, message: '2-50 字符' }]}>
              <Input maxLength={50} placeholder="机器键，如 content_editor" />
            </Form.Item>
          )}
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} maxLength={255} />
          </Form.Item>
          {editing && (
            <Form.Item name="is_activate" label="启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
          <Form.Item label="权限勾选">
            <div style={{ border: '1px solid #F0EBE3', borderRadius: 8, padding: 12, maxHeight: 320, overflow: 'auto' }}>
              <Tree
                checkable
                defaultExpandAll
                selectable={false}
                treeData={treeData}
                checkedKeys={checkedCodes}
                onCheck={(keys) => setCheckedCodes(keys as string[])}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
