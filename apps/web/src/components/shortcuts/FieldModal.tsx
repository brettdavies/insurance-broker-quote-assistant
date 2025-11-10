import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FIELD_METADATA } from '@/config/shortcuts'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { useEffect, useState } from 'react'

interface FieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FieldCommand | null
  onSubmit: (value: string) => void
  initialValue?: string
}

export function FieldModal({ open, onOpenChange, field, onSubmit, initialValue }: FieldModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setValue(initialValue || '')
      setError('')
    }
  }, [open, initialValue])

  const handleSubmit = () => {
    if (!field) return

    // Validation based on field type
    if (field === 'kids' || field === 'dependents' || field === 'vehicles') {
      const num = Number.parseInt(value, 10)
      if (Number.isNaN(num) || num < (field === 'vehicles' ? 1 : 0)) {
        setError(`Please enter a valid number (min: ${field === 'vehicles' ? 1 : 0})`)
        return
      }
    }

    if (field === 'name' && !value.trim()) {
      setError('Please enter a name')
      return
    }

    onSubmit(value)
    onOpenChange(false)
  }

  if (!field) return null

  const metadata = FIELD_METADATA[field]
  const shortcutPrefix = `${metadata.shortcut}:`

  // Determine input type based on field
  const getInputType = (): 'text' | 'number' | 'email' | 'tel' => {
    if (field === 'kids' || field === 'dependents' || field === 'vehicles' || field === 'age' || field === 'household' || field === 'constructionYear' || field === 'squareFeet' || field === 'currentPremium') {
      return 'number'
    }
    if (field === 'email') return 'email'
    if (field === 'phone') return 'tel'
    return 'text'
  }

  const getPlaceholder = (): string => {
    switch (field) {
      case 'kids':
      case 'dependents':
      case 'age':
      case 'household':
        return '0'
      case 'vehicles':
        return '1'
      case 'name':
        return 'John Doe'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{metadata.label}</DialogTitle>
          <DialogDescription>{metadata.question}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Input with shortcut prefix */}
          <div className="flex items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
            <span className="px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
              {shortcutPrefix}
            </span>
            <Input
              type={getInputType()}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              placeholder={getPlaceholder()}
              className="border-0 focus-visible:ring-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
                if (e.key === 'Escape') {
                  onOpenChange(false)
                }
              }}
            />
          </div>
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
