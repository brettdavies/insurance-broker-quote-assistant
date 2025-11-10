/**
 * Chat History Component
 *
 * Displays conversation history showing ONLY broker's typed messages.
 * No AI responses are shown - AI extraction is invisible.
 * Key-value pills render inline within message text.
 */

import { parseKeyValueSyntax } from '@/lib/key-value-parser'
import { useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  text: string
  timestamp: Date
}

interface ChatHistoryProps {
  messages: ChatMessage[]
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesLengthRef = useRef(messages.length)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length !== messagesLengthRef.current) {
      messagesLengthRef.current = messages.length
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
  }, [messages.length])

  const renderMessageWithPills = (text: string) => {
    const parsed = parseKeyValueSyntax(text)
    if (parsed.length === 0) {
      return <span>{text}</span>
    }

    // Split text and insert pills
    const parts: Array<string | ReturnType<typeof parseKeyValueSyntax>[0]> = []
    let lastIndex = 0

    for (const match of parsed) {
      const matchIndex = text.indexOf(match.original, lastIndex)
      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex))
      }
      parts.push(match)
      lastIndex = matchIndex + match.original.length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (typeof part === 'string') {
            return <span key={`text-${idx}-${part.slice(0, 10)}`}>{part}</span>
          }

          // Render pill
          let pillClasses =
            'inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-medium transition-all hover:scale-105'
          switch (part.validation) {
            case 'valid':
              pillClasses += ' bg-green-500 text-white shadow-sm'
              break
            case 'invalid_key':
              pillClasses += ' bg-red-500 text-white shadow-sm'
              break
            case 'invalid_value':
              pillClasses += ' bg-yellow-500 text-black shadow-sm'
              break
          }

          return (
            <span
              key={`pill-${part.key}-${part.value}-${idx}`}
              contentEditable={false}
              data-key={part.key}
              data-value={part.value}
              data-pill="true"
              className={pillClasses}
            >
              {part.original}
            </span>
          )
        })}
      </>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900"
    >
      {messages.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Conversation history will appear here...
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="font-mono text-sm text-gray-900 dark:text-white">
              {renderMessageWithPills(message.text)}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
