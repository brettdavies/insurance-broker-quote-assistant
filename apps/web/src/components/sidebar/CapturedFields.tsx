/**
 * Captured Fields Component
 *
 * Displays captured fields organized by category (Identity, Location, Product, Details).
 * Each field shows name, value, confidence score (if LLM-extracted), and info icon.
 * All fields are clickable to open edit modal.
 *
 * Dynamically reads field definitions from shortcuts.json - no manual field mapping needed.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import {
  COMMAND_TO_FIELD_NAME,
  FIELD_METADATA,
  type FieldCommand,
} from '@/config/shortcuts'
import shortcutsData from '@/config/shortcuts.json'
import type { UserProfile } from '@repo/shared'
import { Info } from 'lucide-react'

interface CapturedField {
  name: string
  value: string | number | boolean | undefined
  confidence?: number
  category: string
  fieldKey: string
}

interface CapturedFieldsProps {
  profile: UserProfile
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
}

/**
 * Map shortcuts.json categories to display categories
 * Maps from shortcuts.json category names to internal category keys
 */
const CATEGORY_MAP: Record<string, string> = {
  'Identity & Contact': 'identity',
  Location: 'location',
  Product: 'product',
  Household: 'details',
  Vehicle: 'details',
  Property: 'details',
  Eligibility: 'details',
  Coverage: 'details',
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  location: 'Location',
  product: 'Product',
  details: 'Details',
}

export function CapturedFields({ profile, onFieldClick }: CapturedFieldsProps) {
  // Organize fields by category - dynamically from shortcuts.json
  const fieldsByCategory: Record<string, CapturedField[]> = {
    identity: [],
    location: [],
    product: [],
    details: [],
  }

  // Iterate through all field shortcuts from shortcuts.json
  const fieldShortcuts = shortcutsData.shortcuts.filter(
    (s): s is typeof shortcutsData.shortcuts[0] & { type: 'field'; category: string; command: string } =>
      s.type === 'field' && s.category !== undefined && s.command !== undefined
  )

  for (const shortcut of fieldShortcuts) {
    const command = shortcut.command as FieldCommand
    const fieldName = COMMAND_TO_FIELD_NAME[command]
    const metadata = FIELD_METADATA[command]

    if (!fieldName || !metadata) continue

    // Map shortcuts.json category to display category
    const displayCategory = CATEGORY_MAP[shortcut.category] || 'details'

    // Check if field exists in profile
    const profileValue = (profile as Record<string, unknown>)[fieldName]

    // Handle different value types
    if (profileValue !== undefined && profileValue !== null && profileValue !== '') {
      let displayValue: string | number | boolean = profileValue as string | number | boolean

      // Format boolean values
      if (typeof profileValue === 'boolean') {
        displayValue = profileValue ? 'Yes' : 'No'
      }

      fieldsByCategory[displayCategory]?.push({
        name: metadata.label,
        value: displayValue,
        category: displayCategory,
        fieldKey: fieldName,
      })
    }
  }

  const totalFields = Object.values(fieldsByCategory).reduce(
    (sum, fields) => sum + fields.length,
    0
  )

  if (totalFields === 0) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No fields captured yet. Start typing to capture information.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Accordion type="multiple" defaultValue={['identity', 'location', 'product', 'details']}>
      {Object.entries(fieldsByCategory).map(([category, fields]) => {
        if (fields.length === 0) return null

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="text-field-name font-semibold">
              {CATEGORY_LABELS[category]} ({fields.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {fields.map((field) => (
                  <button
                    key={field.fieldKey}
                    type="button"
                    onClick={() => onFieldClick(field.fieldKey, field.value)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-left transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-field-name font-semibold">{field.name}:</span>
                      <span className="text-field-value text-gray-700 dark:text-gray-300">
                        {String(field.value)}
                      </span>
                      {field.confidence !== undefined && (
                        <span className="text-confidence text-xs italic text-gray-500 dark:text-gray-400">
                          ({Math.round(field.confidence * 100)}%)
                        </span>
                      )}
                    </div>
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
