/**
 * PrefillViewerModal Component
 *
 * Displays prettified JSON of prefill packet in a modal with copy and download buttons.
 *
 * Single Responsibility: Prefill packet viewing and export
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generatePrefillFilename, handleCopy, handleExport } from '@/lib/prefill-utils'
import type { PrefillPacket } from '@repo/shared'
import { Copy, Download } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { useEffect, useState } from 'react'

interface PrefillViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill: PrefillPacket | null
}

export function PrefillViewerModal({ open, onOpenChange, prefill }: PrefillViewerModalProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true // Default to dark
  })

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  if (!prefill) {
    return null
  }

  const jsonString = JSON.stringify(prefill, null, 2)
  const filename = generatePrefillFilename(prefill)

  const handleCopyClick = async () => {
    try {
      await handleCopy(prefill)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleDownloadClick = () => {
    handleExport(prefill, filename)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Prefill Packet</DialogTitle>
          <DialogDescription>Review and export the prefill packet JSON</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto rounded-md border border-gray-300 dark:border-gray-700">
            <Highlight
              theme={isDark ? themes.vsDark : themes.vsLight}
              code={jsonString}
              language="json"
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={`${className} flex-1 overflow-auto rounded-md p-4 font-mono text-sm leading-[1.6]`}
                  style={{
                    ...style,
                    margin: 0,
                  }}
                >
                  {tokens.map((line, lineIndex) => (
                    <div key={`line-${lineIndex}`} {...getLineProps({ line })}>
                      {line.map((token, tokenIndex) => (
                        <span
                          key={`token-${lineIndex}-${tokenIndex}`}
                          {...getTokenProps({ token })}
                        />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCopyClick}>
            <Copy className="mr-2 h-4 w-4" />
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={handleDownloadClick}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
