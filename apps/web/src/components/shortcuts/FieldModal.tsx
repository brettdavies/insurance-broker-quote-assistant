import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { useEffect, useState } from 'react'

interface FieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FieldCommand | null
  onSubmit: (value: string) => void
}

export function FieldModal({ open, onOpenChange, field, onSubmit }: FieldModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
      setError('')
    }
  }, [open])

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

  const getFieldConfig = () => {
    switch (field) {
      case 'kids':
        return {
          title: 'How many kids?',
          description: 'Enter the number of children',
          type: 'number' as const,
          placeholder: '0',
        }
      case 'vehicles':
        return {
          title: 'How many vehicles?',
          description: 'Enter the number of vehicles',
          type: 'number' as const,
          placeholder: '1',
        }
      case 'name':
        return {
          title: 'Enter Name',
          description: 'Enter first and last name',
          type: 'text' as const,
          placeholder: 'John Doe',
          multiField: true,
        }
      default:
        return {
          title: 'Enter Value',
          description: '',
          type: 'text' as const,
          placeholder: '',
        }
    }
  }

  const config = getFieldConfig()

  if (!field) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type={config.type}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder={config.placeholder}
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
