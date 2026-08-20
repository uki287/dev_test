// 文件功能：富文本渲染前兜底清洗（防御纵深，配合后端入库前清洗 S-03）
// 说明：后端已在写入时白名单清洗；此处渲染前再洗一次，杜绝任何绕过 API 的脏数据执行。
import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'img', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'span', 'div', 'h3', 'h4'],
    ALLOWED_ATTR: ['src', 'alt', 'width', 'height', 'href', 'target', 'rel'],
    // 仅允许安全协议，剥离 javascript: 等
  })
}
