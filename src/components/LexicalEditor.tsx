import { useEffect, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical'
import type { KlassConstructor, LexicalNode } from 'lexical'
import LexicalToolbar from './LexicalToolbar'

interface LexicalEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const theme = {
  paragraph: 'text-sm text-gray-700 mb-1',
  heading: {
    h1: 'text-2xl font-bold mb-2 text-gray-800',
    h2: 'text-xl font-semibold mb-2 text-gray-800',
    h3: 'text-lg font-semibold mb-1 text-gray-800',
  },
  list: {
    ul: 'list-disc ml-4 mb-2',
    ol: 'list-decimal ml-4 mb-2',
    listitem: 'mb-1',
  },
  quote: 'border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2',
  code: 'bg-gray-100 px-1 py-0.5 rounded font-mono text-sm',
  link: 'text-blue-600 underline',
}

function onError(error: Error) {
  console.error(error)
}

function EditorUpdateListener({ onChange }: { onChange: (value: string) => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const children = root.getChildren()
        const text = children.map(child => child.getTextContent()).join('\n')
        onChange(text)
      })
    })

    return unregister
  }, [editor, onChange])

  return null
}

function DefaultErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function InitContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !content) return
    
    editor.update(() => {
      const root = $getRoot()
      if (root.getFirstChild() === null) {
        if (content) {
          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode(content))
          root.append(paragraph)
        } else {
          root.append($createParagraphNode())
        }
        initialized.current = true
      }
    })
  }, [editor, content])

  return null
}

export default function LexicalEditor({ value, onChange, placeholder = 'Escribe aquí...' }: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
    ] as readonly KlassConstructor<typeof LexicalNode>[],
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <LexicalToolbar />
        <div style={{ minHeight: '100px' }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                style={{
                  padding: '0.75rem',
                  minHeight: '100px',
                  outline: 'none',
                  fontSize: '0.875rem',
                }}
              />
            }
            placeholder={
              <div
                style={{
                  position: 'absolute',
                  top: '3.5rem',
                  left: '0.75rem',
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                  pointerEvents: 'none',
                }}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={DefaultErrorBoundary}
          />
          <HistoryPlugin />
          <InitContentPlugin content={value} />
          <EditorUpdateListener onChange={onChange} />
        </div>
      </div>
    </LexicalComposer>
  )
}