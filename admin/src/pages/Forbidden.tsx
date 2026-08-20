// ============================================================
// 文件功能：403 无权限页
// 说明：PermGuard 拦截后重定向至此；提供返回工作台按钮。
// ============================================================
import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <Result
      status="403"
      title="403"
      subTitle="抱歉，您没有权限访问该页面。"
      extra={
        <Button type="primary" style={{ background: '#B98A2F' }} onClick={() => navigate('/dashboard')}>
          返回工作台
        </Button>
      }
    />
  )
}
