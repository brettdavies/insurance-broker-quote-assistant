import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  ACTION_SHORTCUTS_DISPLAY,
  FIELD_SHORTCUTS_DISPLAY,
} from '@/config/shortcuts'
import { useState } from 'react'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [search, setSearch] = useState('')

  const filteredFieldShortcuts = FIELD_SHORTCUTS_DISPLAY.map((category) => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      (s) =>
        s.field.toLowerCase().includes(search.toLowerCase()) ||
        s.key.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((category) => category.shortcuts.length > 0)

  const filteredActionShortcuts = ACTION_SHORTCUTS_DISPLAY.filter(
    (s) =>
      s.action.toLowerCase().includes(search.toLowerCase()) ||
      s.key.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use slash commands to quickly add fields or perform actions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <Input
            placeholder="Search shortcuts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          {/* Field Shortcuts */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Field Shortcuts</h3>
            <div className="space-y-4">
              {filteredFieldShortcuts.map((category) => (
                <div key={category.category}>
                  <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {category.category}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {category.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between rounded bg-gray-100 p-2 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">
                          {shortcut.field}
                        </span>
                        <code className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-300">
                          {shortcut.key}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Shortcuts */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Action Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              {filteredActionShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between rounded bg-gray-100 p-2 dark:bg-gray-800"
                >
                  <span className="text-sm text-gray-900 dark:text-white">{shortcut.action}</span>
                  <code className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-300">
                    {shortcut.key}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
