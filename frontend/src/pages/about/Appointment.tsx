// ============================================================
// 文件功能：在线预约页（Phase E）
// 功能：预约表单（姓名/手机/类型/日期/时段/备注）+ 隐私提示 + 提交成功反馈。
// 说明：验证码已按用户要求移除；提交走后端 /appointments（限流）。
// 权威依据：实施方案 Phase E（关于：在线预约，预约表单 + 隐私提示）。
// ============================================================
import { useState } from 'react'
import { submitAppointment } from '../../api'

export default function Appointment() {
  const [form, setForm] = useState({
    name: '', phone: '', appt_type: 'showroom' as 'showroom' | 'factory',
    appt_date: '', appt_slot: 'morning' as 'morning' | 'afternoon', remark: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = '姓名至少 2 个字符'
    if (!/^1\d{10}$/.test(form.phone)) e.phone = '请输入 11 位手机号'
    if (form.appt_date && form.appt_date < new Date().toISOString().slice(0, 10)) e.appt_date = '日期不能早于今天'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await submitAppointment(form)
      setDone(true)
    } catch (err: any) {
      setErrors({ form: err.message || '提交失败，请稍后再试' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="font-serif text-3xl text-ink mb-3">预约提交成功</h1>
        <p className="text-ink-soft">我们将尽快与您联系确认参观安排</p>
      </div>
    )
  }

  const inputCls = 'w-full px-4 py-3 rounded-md2 border border-line bg-white focus:outline-none focus:ring-2 focus:ring-gold/40'

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-4xl text-ink mb-3">在线预约</h1>
      <p className="text-ink-soft mb-8">预约展厅参观或工厂考察，亲身体验全屋智能生活</p>

      <form onSubmit={onSubmit} noValidate className="bg-white rounded-xl2 shadow-card p-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-ink mb-2" htmlFor="name">姓名 <span className="text-gold">*</span></label>
            <input id="name" className={inputCls} value={form.name} maxLength={20}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="您的称呼" />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm text-ink mb-2" htmlFor="phone">手机号 <span className="text-gold">*</span></label>
            <input id="phone" type="tel" className={inputCls} value={form.phone} maxLength={11}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11 位手机号" />
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm text-ink mb-2" htmlFor="appt_type">预约类型 <span className="text-gold">*</span></label>
            <select id="appt_type" className={inputCls} value={form.appt_type}
              onChange={(e) => setForm({ ...form, appt_type: e.target.value as typeof form.appt_type })}>
              <option value="showroom">展厅参观</option>
              <option value="factory">工厂考察</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-ink mb-2" htmlFor="appt_date">期望日期</label>
              <input id="appt_date" type="date" className={inputCls} value={form.appt_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, appt_date: e.target.value })} />
              {errors.appt_date && <p className="text-sm text-red-500 mt-1">{errors.appt_date}</p>}
            </div>
            <div>
              <label className="block text-sm text-ink mb-2" htmlFor="appt_slot">时段</label>
              <select id="appt_slot" className={inputCls} value={form.appt_slot}
                onChange={(e) => setForm({ ...form, appt_slot: e.target.value as typeof form.appt_slot })}>
                <option value="morning">上午</option>
                <option value="afternoon">下午</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-ink mb-2" htmlFor="remark">备注</label>
            <textarea id="remark" className={inputCls} rows={3} maxLength={200} value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="补充说明（选填）" />
          </div>

          {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-md2 bg-gold text-ink font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? '提交中…' : '提交预约'}
          </button>

          {/* 隐私提示 */}
          <p className="text-xs text-ink-soft/60 leading-relaxed">
            提交即表示您同意我们收集以上信息用于预约安排。我们承诺仅将此信息用于本次预约服务，
            不会向第三方泄露您的个人信息。
          </p>
        </div>
      </form>
    </div>
  )
}
