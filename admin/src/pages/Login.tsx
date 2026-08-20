// ============================================================
// 文件功能：后台登录页
// 说明：
//   - 表单：用户名 / 密码（验证码功能已移除）；
//   - 登录成功：写入 zustand（token+user）并跳转 /dashboard；
//   - force_pwd=true 时由 BasicLayout 强制弹出改密（L-04）；
//   - 视觉：黑底金字（与后台品牌一致）。
// 权威依据：实施方案 Phase C（登录页）+ UI/UX 规范。
// ============================================================
import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const setUser = useAuth((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const data = await login(values.username, values.password)
      setToken(data.access_token)
      setUser(data.user)
      message.success('登录成功')
      navigate('/dashboard', { replace: true })
    } catch (e: any) {
      message.error(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0E0E0E 0%, #1A1A1A 60%, #2B2113 100%)',
      }}
    >
      <Card style={{ width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ color: '#B98A2F', marginBottom: 4 }}>
            TP智能家居
          </Typography.Title>
          <Typography.Text type="secondary">后台管理系统</Typography.Text>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名（admin）" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#B98A2F' }}>
            登 录
          </Button>
        </Form>
      </Card>
    </div>
  )
}