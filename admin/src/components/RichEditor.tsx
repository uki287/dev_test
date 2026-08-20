// ============================================================
// 文件功能：富文本编辑器组件（wangEditor 封装）
// 功能：工具栏含标题/加粗/列表/链接/图片上传（接 /admin/upload）；
//       value/onChange 受控，图片上传自动插入编辑器。
// 权威依据：Phase C 富文本字段（news/product/job content 均为 HTML）。
// ============================================================
import { useEffect, useRef, useState } from 'react'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { uploadFile } from '../api'
import { message } from 'antd'

interface Props {
  value?: string | null
  onChange?: (html: string) => void
  placeholder?: string
  height?: number
}

export default function RichEditor({ value, onChange, placeholder = '请输入内容…', height = 320 }: Props) {
  const editorRef = useRef<IDomEditor | null>(null)
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  // 受控同步：外部 value 变化时写入编辑器（避免光标跳动，仅当差异明显时）
  const lastValue = useRef<string>('')

  // 工具栏配置：隐藏不需要的项，保留常用
  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: ['group-video', 'insertTable', 'codeBlock', 'fullScreen'],
  }

  // 编辑器配置：图片上传走后端接口
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
          try {
            const res = await uploadFile(file)
            insertFn(res.url, '', '')
          } catch (e: any) {
            message.error(e.message || '图片上传失败')
          }
        },
      },
    },
  }

  // 外部 value 变化 → 同步到编辑器（编辑不同记录时刷新内容）
  useEffect(() => {
    if (!editor) return
    const next = value ?? ''
    if (next !== lastValue.current) {
      editor.setHtml(next)
      lastValue.current = next
    }
  }, [editor, value])

  // 组件卸载时销毁编辑器实例（释放事件监听，防止抽屉反复开关内存泄漏）
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={value ?? ''}
        onCreated={(e) => { editorRef.current = e; setEditor(e) }}
        onChange={(e) => {
          const html = e.getHtml()
          lastValue.current = html
          onChange?.(html)
        }}
        mode="default"
        style={{ height }}
      />
    </div>
  )
}
