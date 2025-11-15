/**
 * PillInteractionPlugin - Handles pill interactions (delete, double-click, navigation)
 *
 * Implements:
 * - Backspace/Delete: Removes entire pill atomically
 * - Double-click: Reverts pill to plain text for editing
 * - Arrow keys: Navigate around pills (skip over them, don't enter)
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { $isPillNode, type PillNode } from '../nodes/PillNode'
import { createArrowLeftHandler, createArrowRightHandler } from './handlers/arrow-handler'
import { createBackspaceHandler } from './handlers/backspace-handler'
import { createDeleteHandler } from './handlers/delete-handler'
import { createDoubleClickHandler } from './handlers/double-click-handler'

interface PillInteractionPluginProps {
  onFieldRemoved?: (fieldName: string) => void
}

export function PillInteractionPlugin({ onFieldRemoved }: PillInteractionPluginProps = {}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Helper to remove a pill and notify if it's a valid field
    const removePillAndNotify = (node: PillNode) => {
      const fieldName = node.getFieldName()
      if (fieldName && node.getValidation() === 'valid') {
        // Notify outside of editor.update() to avoid nested updates
        setTimeout(() => {
          onFieldRemoved?.(fieldName)
        }, 0)
      }
      node.remove()
    }

    // Register handlers
    const removeBackspaceListener = createBackspaceHandler(editor, removePillAndNotify)
    const removeDeleteListener = createDeleteHandler(editor, removePillAndNotify)
    const removeArrowLeftListener = createArrowLeftHandler(editor)
    const removeArrowRightListener = createArrowRightHandler(editor)
    const removeClickListener = editor.registerRootListener(createDoubleClickHandler(editor))

    return () => {
      removeBackspaceListener()
      removeDeleteListener()
      removeArrowLeftListener()
      removeArrowRightListener()
      removeClickListener()
    }
  }, [editor, onFieldRemoved])

  return null
}
