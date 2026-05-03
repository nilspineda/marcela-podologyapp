import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND, SELECTION_CHANGE_COMMAND, $createParagraphNode } from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'

export default function LexicalToolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
    }
  }, [])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      1
    )
  }, [editor, updateToolbar])

  useEffect(() => {
    const unregisterUndo = editor.registerCommand(
      UNDO_COMMAND,
      () => {
        setCanUndo(true)
        return false
      },
      1
    )
    const unregisterRedo = editor.registerCommand(
      REDO_COMMAND,
      () => {
        setCanRedo(true)
        return false
      },
      1
    )
    return () => {
      unregisterUndo()
      unregisterRedo()
    }
  }, [editor])

  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
  }

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
  }

  const formatUnderline = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  }

  const formatStrikethrough = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
  }

  const setHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const setParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const setQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const insertBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  }

  const insertNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined)
  }

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined)
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.group}>
        <button onClick={undo} disabled={!canUndo} style={{...styles.btn, opacity: canUndo ? 1 : 0.4}} title="Deshacer">
          <Undo size={16} />
        </button>
        <button onClick={redo} disabled={!canRedo} style={{...styles.btn, opacity: canRedo ? 1 : 0.4}} title="Rehacer">
          <Redo size={16} />
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.group}>
        <button onClick={setParagraph} style={styles.btn} title="Párrafo">
          <Type size={16} />
        </button>
        <button onClick={() => setHeading('h1')} style={styles.btn} title="Título 1">
          <Heading1 size={16} />
        </button>
        <button onClick={() => setHeading('h2')} style={styles.btn} title="Título 2">
          <Heading2 size={16} />
        </button>
        <button onClick={() => setHeading('h3')} style={styles.btn} title="Título 3">
          <Heading3 size={16} />
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.group}>
        <button onClick={formatBold} style={{...styles.btn, ...(isBold ? styles.btnActive : {})}} title="Negrita (Ctrl+B)">
          <Bold size={16} />
        </button>
        <button onClick={formatItalic} style={{...styles.btn, ...(isItalic ? styles.btnActive : {})}} title="Cursiva (Ctrl+I)">
          <Italic size={16} />
        </button>
        <button onClick={formatUnderline} style={{...styles.btn, ...(isUnderline ? styles.btnActive : {})}} title="Subrayado (Ctrl+U)">
          <Underline size={16} />
        </button>
        <button onClick={formatStrikethrough} style={{...styles.btn, ...(isStrikethrough ? styles.btnActive : {})}} title="Tachado">
          <Strikethrough size={16} />
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.group}>
        <button onClick={insertBulletList} style={styles.btn} title="Viñetas">
          <List size={16} />
        </button>
        <button onClick={insertNumberedList} style={styles.btn} title="Lista numerada">
          <ListOrdered size={16} />
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.group}>
        <button onClick={setQuote} style={styles.btn} title="Cita">
          <Quote size={16} />
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    borderRadius: '8px 8px 0 0',
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.125rem',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: '#e5e7eb',
    margin: '0 0.25rem',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnActive: {
    backgroundColor: '#fef5f4',
    color: '#e19c96',
  },
}