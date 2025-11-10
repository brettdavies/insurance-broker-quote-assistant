/**
 * Captured Fields Component
 *
 * Displays captured fields organized by category (Identity, Location, Product, Details).
 * Each field shows name, value, confidence score (if LLM-extracted), and info icon.
 * All fields are clickable to open edit modal.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import type { UserProfile } from '@repo/shared'
import { Info } from 'lucide-react'

interface CapturedField {
  name: string
  value: string | number | boolean | undefined
  confidence?: number
  category: 'identity' | 'location' | 'product' | 'details'
  fieldKey: string
}

interface CapturedFieldsProps {
  profile: UserProfile
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  location: 'Location',
  product: 'Product',
  details: 'Details',
}

export function CapturedFields({ profile, onFieldClick }: CapturedFieldsProps) {
  // Organize fields by category
  const fieldsByCategory: Record<string, CapturedField[]> = {
    identity: [],
    location: [],
    product: [],
    details: [],
  }

  // Map profile fields to categories
  if (profile.name) {
    fieldsByCategory.identity?.push({
      name: 'Name',
      value: String(profile.name),
      category: 'identity',
      fieldKey: 'name',
    })
  }
  if ((profile as { email?: string }).email) {
    fieldsByCategory.identity?.push({
      name: 'Email',
      value: String((profile as { email: string }).email),
      category: 'identity',
      fieldKey: 'email',
    })
  }
  if ((profile as { phone?: string }).phone) {
    fieldsByCategory.identity?.push({
      name: 'Phone',
      value: String((profile as { phone: string }).phone),
      category: 'identity',
      fieldKey: 'phone',
    })
  }

  if (profile.state) {
    fieldsByCategory.location?.push({
      name: 'State',
      value: String(profile.state),
      category: 'location',
      fieldKey: 'state',
    })
  }
  if ((profile as { zip?: string }).zip) {
    fieldsByCategory.location?.push({
      name: 'Zip Code',
      value: String((profile as { zip: string }).zip),
      category: 'location',
      fieldKey: 'zip',
    })
  }

  if (profile.productLine) {
    fieldsByCategory.product?.push({
      name: 'Product Line',
      value: String(profile.productLine),
      category: 'product',
      fieldKey: 'productLine',
    })
  }

  if (profile.age !== undefined) {
    fieldsByCategory.details?.push({
      name: 'Age',
      value: profile.age,
      category: 'details',
      fieldKey: 'age',
    })
  }
  if (profile.householdSize !== undefined) {
    fieldsByCategory.details?.push({
      name: 'Household Size',
      value: profile.householdSize,
      category: 'details',
      fieldKey: 'household',
    })
  }
  if ((profile as { kids?: number }).kids !== undefined) {
    fieldsByCategory.details?.push({
      name: 'Kids',
      value: (profile as { kids: number }).kids,
      category: 'details',
      fieldKey: 'kids',
    })
  }
  if (profile.vehicles !== undefined) {
    fieldsByCategory.details?.push({
      name: 'Vehicles',
      value: profile.vehicles,
      category: 'details',
      fieldKey: 'vehicles',
    })
  }
  if (profile.ownsHome !== undefined) {
    fieldsByCategory.details?.push({
      name: 'Owns Home',
      value: profile.ownsHome ? 'Yes' : 'No',
      category: 'details',
      fieldKey: 'ownsHome',
    })
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
                  <div
                    key={field.fieldKey}
                    onClick={() => onFieldClick(field.fieldKey, field.value)}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-gray-700"
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
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
