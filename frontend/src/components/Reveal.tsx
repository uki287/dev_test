// ============================================================
// 文件功能：滚动入场动画组件（IntersectionObserver 驱动）
// 说明：元素进入视口时添加 visible 类触发 CSS 过渡（fade-up）；
//       降级友好：无 IO 支持时直接显示；respect reduced-motion。
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** 延迟（ms），用于交错动画 */
  delay?: number
  /** 方向：上/左/右/缩放 */
  from?: 'up' | 'left' | 'right' | 'zoom'
  className?: string
}

export default function Reveal({ children, delay = 0, from = 'up', className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 系统减少动效 → 直接显示
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal reveal-${from} ${visible ? 'reveal-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
