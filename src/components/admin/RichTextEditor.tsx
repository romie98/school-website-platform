import { useEffect, useRef } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Link2, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Heading2, Heading3,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  label?: string
  minHeight?: string
}

export function RichTextEditor({ value, onChange, label, minHeight = '220px' }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const run = (command: string, arg?: string) => {
    document.execCommand(command, false, arg)
    onChange(ref.current?.innerHTML ?? '')
  }

  const addLink = () => {
    const url = window.prompt('Link URL')
    if (url) run('createLink', url)
  }

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) run('insertImage', url)
  }

  return (
    <div>
      {label && <p className="mb-1 text-sm font-medium text-brand">{label}</p>}
      <div className="overflow-hidden rounded-md border border-brand/20 bg-white">
        <div className="flex flex-wrap gap-1 border-b border-brand/10 bg-cream p-1">
          <ToolbarButton onClick={() => run('bold')} label="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('italic')} label="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('underline')} label="Underline"><Underline className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('formatBlock', 'h2')} label="Heading"><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('formatBlock', 'h3')} label="Subheading"><Heading3 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('insertUnorderedList')} label="Bullets"><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('insertOrderedList')} label="Numbers"><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('formatBlock', 'blockquote')} label="Quote"><Quote className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={addLink} label="Link"><Link2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={addImage} label="Insert image"><ImageIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('justifyLeft')} label="Align left"><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('justifyCenter')} label="Align centre"><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => run('justifyRight')} label="Align right"><AlignRight className="h-4 w-4" /></ToolbarButton>
        </div>
        <div
          ref={ref}
          className="cms-prose px-3 py-2 text-sm outline-none"
          style={{ minHeight }}
          contentEditable
          role="textbox"
          aria-label={label ?? 'Rich text'}
          onInput={() => onChange(ref.current?.innerHTML ?? '')}
        />
      </div>
    </div>
  )
}

function ToolbarButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" className="rounded p-1.5 text-brand hover:bg-white" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  )
}
