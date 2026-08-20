// ============================================================
// 文件功能：后台主布局（黑底金字侧栏 + 米白顶栏 + 面包屑）
// 说明：
//   - Sider 宽 220px、背景 #0E0E0E、菜单金字 #D4AF5A（A-2 设计 token 落地）；
//   - 菜单项按当前用户权限码过滤（L-05：无权限菜单不展示）；
//   - 顶栏含面包屑（当前菜单路径）、用户下拉（修改密码/退出登录）。
// 权威依据：UI/UX 规范（黑底金字菜单）+ 实施方案 Phase C（布局）。
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Dropdown, Avatar, Breadcrumb, Modal, Form, Input, message } from 'antd'
import { UserOutlined, LogoutOutlined, KeyOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, doLogout } from '../store/auth'
import { matchPerm } from '../store/auth'
import * as api from '../api'

const { Header, Sider, Content } = Layout

// 菜单定义：key=路由路径，perm=所需权限码（null 表示登录即可见）
interface MenuDef {
  key: string
  label: string
  perm: string | null
}
const MENUS: MenuDef[] = [
  { key: '/dashboard', label: '工作台', perm: null },
  { key: '/banners', label: '轮播图管理', perm: 'banner:list' },
  { key: '/series', label: '产品系列', perm: 'series:list' },
  { key: '/products', label: '产品管理', perm: 'product:list' },
  { key: '/news', label: '新闻管理', perm: 'news:list' },
  { key: '/jobs', label: '招聘管理', perm: 'job:list' },
  { key: '/about', label: '关于管理', perm: 'about:list' },
  // Phase D：业务与系统
  { key: '/appointments', label: '预约管理', perm: 'appointment:view' },
  { key: '/messages', label: '留言管理', perm: 'message:view' },
  { key: '/users', label: '管理员管理', perm: 'user:list' },
  { key: '/roles', label: '角色管理', perm: 'role:list' },
  { key: '/logs', label: '操作日志', perm: 'log:view' },
  { key: '/stats', label: '数据统计', perm: 'stat:view' },
  { key: '/settings', label: '系统设置', perm: 'setting:list' },
]

export default function BasicLayout() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdForm] = Form.useForm()
  const [pwdLoading, setPwdLoading] = useState(false)

  // 按权限过滤菜单（L-05）
  const menus = useMemo(() => {
    const perms = user?.perms ?? []
    return MENUS.filter((m) => !m.perm || matchPerm(perms, m.perm))
  }, [user])

  // 面包屑：根据当前路径定位菜单标题
  const breadcrumb = useMemo(() => {
    const found = MENUS.find((m) => location.pathname.startsWith(m.key))
    return found ? [found.label] : []
  }, [location.pathname])

  // 强制改密（L-04）：force_pwd=true 时拦截，进入前强制完成
  const forcePwd = user?.force_pwd === true
  useEffect(() => {
    if (forcePwd) setPwdOpen(true) // 强制改密弹窗不可关闭
  }, [forcePwd])

  const onResetPassword = async () => {
    const values = await pwdForm.validateFields()
    setPwdLoading(true)
    try {
      await api.resetPassword(values.oldPassword, values.newPassword)
      message.success('密码已更新，请重新登录')
      setPwdOpen(false)
      useAuth.getState().setUser({ ...user!, force_pwd: false }) // 清除强制改密标记
      // 更新令牌（改密后原令牌仍有效；此处简单登出重登更安全）
      doLogout()
    } catch (e: any) {
      message.error(e.message || '修改失败')
    } finally {
      setPwdLoading(false)
    }
  }

  // 强制改密：不可关闭，直接弹出
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏：黑底金字 */}
      <Sider width={220} style={{ background: '#0E0E0E' }}>
        <div style={{ color: '#B98A2F', fontSize: 18, padding: '20px 24px', fontWeight: 700, letterSpacing: 1 }}>
          TP智能家居
        </div>
        <div style={{ color: '#8A8A8A', fontSize: 12, padding: '0 24px 16px' }}>后台管理系统</div>
        <Menu
          theme="dark"
          mode="inline"
          style={{ background: '#0E0E0E', borderInlineEnd: 'none' }}
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menus.map((m) => ({
            key: m.key,
            label: <span style={{ color: '#D4AF5A', fontSize: 15 }}>{m.label}</span>,
          }))}
        />
      </Sider>

      <Layout>
        {/* 顶栏：米白底 + 面包屑 + 用户区 */}
        <Header
          style={{
            background: '#FAF8F4', padding: '0 24px', height: 56, lineHeight: '56px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #E5E0D8',
          }}
        >
          <Breadcrumb items={[{ title: '后台管理' }, ...breadcrumb.map((t) => ({ title: t }))]} />
          <Dropdown
            menu={{
              items: [
                { key: 'pwd', icon: <KeyOutlined />, label: '修改密码' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') doLogout()
                if (key === 'pwd') setPwdOpen(true)
              },
            }}
          >
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" style={{ background: '#B98A2F' }} icon={<UserOutlined />} />
              <span>{user?.cn_name || user?.username}</span>
              <span style={{ color: '#999', fontSize: 12 }}>{user?.role_name}</span>
            </span>
          </Dropdown>
        </Header>

        {/* 内容区：嵌套路由出口 */}
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* 修改密码 / 强制改密弹窗 */}
      <Modal
        title={forcePwd ? '首次登录需修改密码' : '修改密码'}
        open={pwdOpen}
        onOk={onResetPassword}
        confirmLoading={pwdLoading}
        onCancel={forcePwd ? undefined : () => setPwdOpen(false)}
        closable={!forcePwd}
        maskClosable={!forcePwd}
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password placeholder="原密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '新密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="新密码（至少 6 位）" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
