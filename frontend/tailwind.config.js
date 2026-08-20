// ============================================================
// 文件功能：Tailwind 设计 token（前台官网视觉规范落地）
// 说明：严格映射《UI/UX 规范》§3 色板与排版：
//   - ink（墨黑）/ gold（暖金，C-02 待确认沿用 #B98A2F）/ cream（米白）/ line（线）；
//   - 字体：标题衬线 Playfair Display + Noto Serif SC，正文无衬线 Inter + PingFang SC；
//   - 圆角：16 / 8 / 6（方案 §4.1）；
//   - 阴影：shadow-gold（暖金辉光）/ shadow-card（卡片）。
// ============================================================
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 品牌色板
      colors: {
        ink: { DEFAULT: '#1A1A1A', deep: '#0E0E0E', soft: '#333333' }, // 墨黑系
        gold: { DEFAULT: '#B98A2F', light: '#D4AF5A', dark: '#9A6F1F' }, // 暖金主色
        cream: { DEFAULT: '#FAF8F4', deep: '#F5F1E8' },                 // 米白底
        line: '#E5E0D8',                                                 // 分割线
      },
      // 字体族
      fontFamily: {
        serif: ['"Playfair Display"', '"Noto Serif SC"', 'serif'], // 标题衬线
        sans: ['Inter', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'], // 正文无衬线
      },
      // 圆角（方案约定）
      borderRadius: {
        xl2: '16px',
        lg2: '8px',
        md2: '6px',
      },
      // 阴影
      boxShadow: {
        gold: '0 8px 30px rgba(185, 138, 47, 0.18)',
        card: '0 4px 20px rgba(26, 26, 26, 0.06)',
      },
    },
  },
  plugins: [],
}
