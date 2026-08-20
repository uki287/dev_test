// ============================================================
// 文件功能：系统设置页
// 功能：网站名称 / Logo / ICP 备案 / 版权文案 / 轮播间隔（3-60 秒）。
//       读取与保存均走 /admin/settings（setting:* 权限）。
// 权威依据：实施方案 Phase C（系统设置：网站名/Logo/ICP/版权/轮播间隔）。
// ============================================================
import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Space, Spin, Upload, message } from 'antd'
import { SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { getSettings, updateSettings, uploadFile } from '../../api'

export default function SettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Logo 上传状态（与产品封面区一致：独立 loading + 加载失败兜底）
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverBroken, setCoverBroken] = useState(false)

  // 拉取当前设置
  useEffect(() => {
    setLoading(true)
    getSettings()
      .then((s) => form.setFieldsValue(s))
      .catch((e: any) => message.error(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [form])

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await updateSettings(values)
      message.success('设置已保存')
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="系统设置" style={{ maxWidth: 640 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item name="site_name" label="网站名称">
            <Input maxLength={120} placeholder="TP智能家居" />
          </Form.Item>
          <Form.Item name="logo" label="Logo">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }) => {
                const logo = getFieldValue('logo')
                return (
                  <Upload
                    maxCount={1}
                    showUploadList={false}
                    accept="image/*"
                    customRequest={async ({ file, onSuccess, onError }) => {
                      setCoverUploading(true)
                      try {
                        const res = await uploadFile(file as File)
                        setFieldValue('logo', res.url)
                        setCoverBroken(false)
                        message.success('Logo 上传成功')
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
                      {logo && (
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                          {coverBroken ? (
                            <div style={{
                              width: 220, height: 80, borderRadius: 8,
                              background: '#FAFAFA', border: '1px dashed #E5E0D8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#999', fontSize: 12,
                            }}>
                              Logo 缺失或加载失败，请重新上传
                            </div>
                          ) : (
                            <img
                              src={logo}
                              alt="logo 预览"
                              onError={() => setCoverBroken(true)}
                              style={{
                                width: 220, height: 80, objectFit: 'contain',
                                background: '#FAFAFA', border: '1px solid #E5E0D8',
                                borderRadius: 8, padding: 4, cursor: 'pointer',
                              }}
                            />
                          )}
                        </div>
                      )}
                      <Space>
                        <Button icon={logo ? <SyncOutlined /> : <UploadOutlined />} loading={coverUploading}>
                          {logo ? '更换 Logo' : '上传 Logo'}
                        </Button>
                        {logo && (
                          <Button size="small" danger onClick={() => setFieldValue('logo', null)}>
                            移除 Logo
                          </Button>
                        )}
                      </Space>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                        建议透明背景 PNG，高度 32–80px；最大 5MB
                      </div>
                    </div>
                  </Upload>
                )
              }}
            </Form.Item>
          </Form.Item>
          <Form.Item name="icp" label="ICP 备案号">
            <Input maxLength={50} placeholder="粤ICP备00000000号" />
          </Form.Item>
          <Form.Item name="copyright" label="版权文案">
            <Input maxLength={255} placeholder="© 2026 TP智能家居" />
          </Form.Item>
          <Form.Item name="slider_interval" label="轮播间隔（秒）" rules={[{ required: true, message: '请输入轮播间隔' }]}>
            <InputNumber min={3} max={60} style={{ width: 160 }} addonAfter="秒" />
          </Form.Item>
          <Form.Item
            name="baidu_map_ak"
            label="百度地图 AK"
            tooltip="前台联系页地图使用。前往 lbsyun.baidu.com 申请「浏览器端 JS API」密钥，并配置 Referer 白名单为本站域名。"
          >
            <Input maxLength={255} placeholder="如：ABCDE12345fghij67890KLmnopqrst" />
          </Form.Item>
          <Form.Item name="map_image" label="地图图片（联系页展示，点击跳转百度地图）">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }) => {
                const img = getFieldValue('map_image')
                return (
                  <Upload
                    maxCount={1}
                    showUploadList={false}
                    accept="image/*"
                    customRequest={async ({ file, onSuccess, onError }) => {
                      setCoverUploading(true)
                      try {
                        const res = await uploadFile(file as File)
                        setFieldValue('map_image', res.url)
                        setCoverBroken(false)
                        message.success('地图图片上传成功')
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
                      {img && (
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                          {coverBroken ? (
                            <div style={{
                              width: 320, height: 180, borderRadius: 8,
                              background: '#FAFAFA', border: '1px dashed #E5E0D8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#999', fontSize: 12,
                            }}>
                              图片缺失或加载失败，请重新上传
                            </div>
                          ) : (
                            <img
                              src={img}
                              alt="地图图片预览"
                              onError={() => setCoverBroken(true)}
                              style={{
                                width: 320, height: 180, objectFit: 'cover',
                                borderRadius: 8, cursor: 'pointer',
                              }}
                            />
                          )}
                        </div>
                      )}
                      <Space>
                        <Button icon={img ? <SyncOutlined /> : <UploadOutlined />} loading={coverUploading}>
                          {img ? '更换图片' : '上传图片'}
                        </Button>
                        {img && (
                          <Button size="small" danger onClick={() => setFieldValue('map_image', null)}>
                            移除图片
                          </Button>
                        )}
                      </Space>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                        建议使用地图截图（16:9），前台点击后跳转百度地图定位；最大 5MB
                      </div>
                    </div>
                  </Upload>
                )
              }}
            </Form.Item>
          </Form.Item>
          <Button type="primary" loading={saving} onClick={onSave} style={{ background: '#B98A2F' }}>
            保存设置
          </Button>
        </Form>
      )}
    </Card>
  )
}
