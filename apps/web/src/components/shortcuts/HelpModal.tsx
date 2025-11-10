import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

const FIELD_SHORTCUTS = [
  {
    category: 'Identity & Contact',
    shortcuts: [
      { key: '/n', field: 'Name' },
      { key: '/e', field: 'Email' },
      { key: '/p', field: 'Phone' },
    ],
  },
  {
    category: 'Location',
    shortcuts: [
      { key: '/s', field: 'State' },
      { key: '/z', field: 'Zip Code' },
    ],
  },
  { category: 'Product', shortcuts: [{ key: '/l', field: 'Product Line' }] },
  {
    category: 'Household',
    shortcuts: [
      { key: '/a', field: 'Age' },
      { key: '/h', field: 'Household Size' },
      { key: '/k', field: 'Kids' },
      { key: '/d', field: 'Dependents' },
    ],
  },
  {
    category: 'Vehicle',
    shortcuts: [
      { key: '/v', field: 'Vehicles' },
      { key: '/g', field: 'Garage Type' },
      { key: '/i', field: 'VINs' },
      { key: '/r', field: 'Drivers / Carrier' },
      { key: '/c', field: 'Driving Records' },
      { key: '/u', field: 'Clean Record' },
    ],
  },
  {
    category: 'Property',
    shortcuts: [
      { key: '/o', field: 'Owns Home' },
      { key: '/t', field: 'Property Type' },
      { key: '/y', field: 'Construction Year' },
      { key: '/f', field: 'Roof Type' },
      { key: '/q', field: 'Square Feet' },
    ],
  },
  {
    category: 'Coverage',
    shortcuts: [
      { key: '/m', field: 'Current Premium' },
      { key: '/b', field: 'Deductibles' },
      { key: '/x', field: 'Coverage Limits' },
      { key: '/w', field: 'Existing Policies' },
    ],
  },
]

const ACTION_SHORTCUTS = [
  { key: '/export', action: 'Export to IQuote Pro' },
  { key: '/copy', action: 'Copy to Clipboard' },
  { key: '/reset', action: 'Reset Session' },
  { key: '/policy', action: 'Switch to Policy Mode' },
  { key: '/intake', action: 'Switch to Intake Mode' },
  { key: '/help or /?', action: 'Show Keyboard Shortcuts' },
]

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [search, setSearch] = useState('')

  const filteredFieldShortcuts = FIELD_SHORTCUTS.map((category) => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      (s) =>
        s.field.toLowerCase().includes(search.toLowerCase()) ||
        s.key.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((category) => category.shortcuts.length > 0)

  const filteredActionShortcuts = ACTION_SHORTCUTS.filter(
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
