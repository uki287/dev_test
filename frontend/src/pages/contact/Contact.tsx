// ============================================================
// 文件功能：联系我们页（Phase E）
// 功能：联系信息（company_info：地址/电话/邮箱/营业时间）+ 留言表单 + 隐私提示。
// 说明：地图嵌入位【待确认 C-05】以静态占位处理；验证码已按用户要求移除。
// ============================================================
import { useEffect, useState } from 'react'
import { getCompanyInfo, submitMessage } from '../../api'
import type { CompanyInfo } from '../../api/types'
import MapEmbed from '../../components/MapEmbed'

export default function Contact() {
  const [company, setCompany] = useState<CompanyInfo[]>([])
  const [form, setForm] = useState({
    name: '', phone: '', email: '', type: 'product' as
      'product' | 'cooperation' | 'aftersale' | 'other', content: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getCompanyInfo().then(setCompany).catch(() => setCompany([]))
  }, [])

  const info = Object.fromEntries(company.map((c) => [c.info_key, c.info_value]))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = '姓名至少 2 个字符'
    if (!/^1\d{10}$/.test(form.phone)) e.phone = '请输入 11 位手机号'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = '邮箱格式不正确'
    if (form.content.trim().length < 10) e.content = '留言内容至少 10 个字'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await submitMessage({ ...form, source_page: '/contact' })
      setDone(true)
    } catch (err: any) {
      setErrors({ form: err.message || '提交失败，请稍后再试' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-md2 border border-line bg-white focus:outline-none focus:ring-2 focus:ring-gold/40'

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-4xl text-ink mb-3">联系我们</h1>
      <p className="text-ink-soft mb-10">我们期待与您交流</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 联系信息 + 地图占位（C-05 待确认） */}
        <div>
          <div className="space-y-4 mb-8">
            <div><div className="text-sm text-ink-soft">地址</div><div className="text-ink font-medium">{info.address || '-'}</div></div>
            <div><div className="text-sm text-ink-soft">电话</div><div className="text-ink font-medium">{info.phone || '-'}</div></div>
            <div><div className="text-sm text-ink-soft">邮箱</div><div className="text-ink font-medium">{info.email || '-'}</div></div>
            <div><div className="text-sm text-ink-soft">营业时间</div><div className="text-ink font-medium">{info.business_hours || '-'}</div></div>
          </div>
          {/* 交互式真实地图（Leaflet + OSM，点击放大查看） */}
          <MapEmbed address={info.address || '深圳市南山区科技园'} name="TP智能家居" />
        </div>

        {/* 留言表单 */}
        <div>
          {done ? (
            <div className="bg-white rounded-xl2 shadow-card p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="font-serif text-2xl text-ink mb-2">留言提交成功</div>
              <p className="text-ink-soft">感谢您的反馈，我们将尽快回复</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="bg-white rounded-xl2 shadow-card p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-ink mb-2" htmlFor="m-name">姓名 <span className="text-gold">*</span></label>
                  <input id="m-name" className={inputCls} maxLength={20} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="您的称呼" />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm text-ink mb-2" htmlFor="m-phone">手机号 <span className="text-gold">*</span></label>
                  <input id="m-phone" type="tel" className={inputCls} maxLength={11} value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11 位手机号" />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-ink mb-2" htmlFor="m-email">邮箱</label>
                  <input id="m-email" type="email" className={inputCls} maxLength={120} value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="选填" />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm text-ink mb-2" htmlFor="m-type">咨询类型 <span className="text-gold">*</span></label>
                  <select id="m-type" className={inputCls} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
                    <option value="product">产品咨询</option>
                    <option value="cooperation">渠道合作</option>
                    <option value="aftersale">售后服务</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-ink mb-2" htmlFor="m-content">留言内容 <span className="text-gold">*</span></label>
                <textarea id="m-content" className={inputCls} rows={4} maxLength={500} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="请描述您的需求（10-500 字）" />
                {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content}</p>}
              </div>

              {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}

              <button type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? '提交中…' : '提交留言'}
              </button>

              <p className="text-xs text-ink-soft/60 leading-relaxed">
                提交即表示您同意我们收集以上信息用于回复咨询。我们承诺不会向第三方泄露您的个人信息。
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
