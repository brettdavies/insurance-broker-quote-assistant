/**
 * Missing Fields Component
 *
 * Displays missing required fields with priority indicators.
 * Priority: 🔴 Red (critical), 🟡 Yellow (important), ⚪ Gray (optional)
 * Shows progress bar with completion percentage.
 * All fields are clickable to open edit modal.
 */

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Info } from 'lucide-react'

export interface MissingField {
  name: string
  priority: 'critical' | 'important' | 'optional'
  fieldKey: string
  alias?: string
}

interface MissingFieldsProps {
  missingFields: MissingField[]
  capturedCount: number
  totalRequired: number
  onFieldClick: (fieldKey: string) => void
}

const PRIORITY_INDICATORS = {
  critical: '🔴',
  important: '🟡',
  optional: '⚪',
}

const PRIORITY_LABELS = {
  critical: 'Critical',
  important: 'Important',
  optional: 'Optional',
}

export function MissingFields({
  missingFields,
  capturedCount,
  totalRequired,
  onFieldClick,
}: MissingFieldsProps) {
  const completionPercentage =
    totalRequired > 0 ? Math.round((capturedCount / totalRequired) * 100) : 0

  if (missingFields.length === 0) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              ✓ All required fields captured!
            </p>
            <Progress value={100} className="h-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {capturedCount}/{totalRequired} fields - 100% complete
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by priority
  const fieldsByPriority = {
    critical: missingFields.filter((f) => f.priority === 'critical'),
    important: missingFields.filter((f) => f.priority === 'important'),
    optional: missingFields.filter((f) => f.priority === 'optional'),
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Progress</span>
              <span className="text-gray-600 dark:text-gray-400">
                {capturedCount}/{totalRequired} fields - {completionPercentage}% complete
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Missing Fields by Priority */}
          <div className="space-y-3">
            {Object.entries(fieldsByPriority).map(([priority, fields]) => {
              if (fields.length === 0) return null

              return (
                <div key={priority} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                    {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]} ({fields.length})
                  </h4>
                  <div className="space-y-1">
                    {fields.map((field) => (
                      <div
                        key={field.fieldKey}
                        onClick={() => onFieldClick(field.fieldKey)}
                        className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{PRIORITY_INDICATORS[field.priority]}</span>
                          <span className="text-field-name font-semibold text-red-600 dark:text-red-400">
                            {field.name}: MISSING
                          </span>
                        </div>
                        <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
