/**
 * Lexical Editor Configuration
 *
 * Centralized configuration for the KeyValueEditor.
 */

import { logError } from '@/lib/logger'
import { PillNode } from '../../notes/nodes/PillNode'

export const editorConfig = {
  namespace: 'KeyValueEditor',
  nodes: [PillNode],
  onError(error: Error) {
    void logError('Lexical error', error)
  },
  theme: {
    root: 'focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[150px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
} as const
