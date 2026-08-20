// ============================================================
// 文件功能：联系页地图卡片组件（2026-08-20 改造）
// 功能：展示后台配置的地图图片（settings.map_image）；
//       点击图片跳转百度地图（按地址搜索定位），无需 AK。
//       未配置图片时显示「待后台配置」占位提示。
// 说明：原交互式百度地图（BMap）已移除，改静态图片+跳转，零 AK 依赖。
// ============================================================
import { useEffect, useState } from 'react'
import { getSettings } from '../api'

export default function MapEmbed({ address, name }: { address: string; name?: string }) {
  const [mapImage, setMapImage] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    let alive = true
    getSettings()
      .then((s) => { if (alive) setMapImage(s.map_image || null) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [])

  const openBaidu = () => {
    // 百度地图网页版：按地址搜索定位（零 AK）
    const url = `https://map.baidu.com/search/${encodeURIComponent(address || name || '')}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div>
      <div className="relative h-64 rounded-xl2 overflow-hidden border border-line">
        {mapImage ? (
          <button
            type="button"
            onClick={openBaidu}
            className="block w-full h-full group"
            aria-label={`在地图中查看：${address || name || ''}`}
            title="点击在百度地图中查看"
          >
            {broken ? (
              <div className="w-full h-full flex items-center justify-center text-ink-soft text-sm bg-line/40">
                图片缺失或加载失败，请到后台重新上传
              </div>
            ) : (
              <img
                src={mapImage}
                alt={address || '地图'}
                onError={() => setBroken(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 bg-line/50">
            <div className="text-ink text-sm font-medium mb-1">地图图片待配置</div>
            <div className="text-ink-soft text-xs leading-relaxed">
              请在后台「系统设置 → 地图图片」上传地图截图后刷新即可显示
            </div>
          </div>
        )}

        {/* 右下角跳转提示 */}
        {mapImage && (
          <div className="absolute right-3 bottom-3 z-[5] px-3 py-1.5 rounded-md2 bg-gold text-ink text-sm font-medium shadow-lg
                          opacity-90 hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            在百度地图中查看
          </div>
        )}
      </div>

      {/* 地址提示条 */}
      {address && (
        <div className="mt-3 text-sm text-ink-soft flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B98A2F" strokeWidth="2" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{address}</span>
        </div>
      )}
    </div>
  )
}
