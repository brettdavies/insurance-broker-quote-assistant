/**
 * Field Injection Plugin
 *
 * Injects field pills into the Lexical editor when a field command is submitted.
 * Single Responsibility: Field pill injection only
 */

import { COMMAND_TO_KEY } from '@/config/shortcuts'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodes, TextNode } from 'lexical'
import { useEffect } from 'react'

interface FieldInjectionPluginProps {
  fieldCommand: FieldCommand | null
  value: string | null
  onComplete: () => void
}

export function FieldInjectionPlugin({
  fieldCommand,
  value,
  onComplete,
}: FieldInjectionPluginProps): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!fieldCommand || !value) return

    // Get shortcut key from shortcuts config (ensures no drift)
    const key = COMMAND_TO_KEY[fieldCommand]
    const pill = `${key}:${value}`

    editor.update(() => {
      const textNode = new TextNode(`${pill} `)
      $insertNodes([textNode])
      textNode.selectNext()
    })

    onComplete()
  }, [fieldCommand, value, editor, onComplete])

  return null
}
