// ============================================================
// 文件功能：前台站点配置 Store（zustand）
// 说明：站点名/Logo/ICP/版权/轮播间隔；供全局组件（页脚/轮播）读取。
// ============================================================
import { create } from 'zustand'
import type { Settings } from '../api/types'

interface SiteState {
  settings: Settings | null
  setSettings: (s: Settings) => void
}

export const useSite = create<SiteState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
}))
