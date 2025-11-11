/**
 * Sidebar Component
 *
 * Adaptive sidebar container that displays captured fields, missing fields,
 * and mode-specific panels (routing status for intake, savings dashboard for policy).
 */

import { Button } from '@/components/ui/button'
import type { PolicySummary, UserProfile } from '@repo/shared'
import { CapturedFields } from './CapturedFields'
import { type MissingField, MissingFields } from './MissingFields'
import { PolicyFields } from './PolicyFields'

interface SidebarProps {
  mode: 'intake' | 'policy'
  profile: UserProfile
  missingFields: MissingField[]
  capturedCount: number
  totalRequired: number
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  onExport?: () => void
  policySummary?: PolicySummary
  confidence?: Record<string, number>
}

export function Sidebar({
  mode,
  profile,
  missingFields,
  capturedCount,
  totalRequired,
  onFieldClick,
  onExport,
  policySummary,
  confidence,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto bg-gray-100 p-4 dark:bg-gray-800">
      {/* Export Button */}
      {onExport && (
        <div className="flex justify-end">
          <Button onClick={onExport} variant="outline" size="sm">
            Download JSON
          </Button>
        </div>
      )}

      {/* Captured Fields Section */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">
          {mode === 'policy' ? 'Policy Fields' : 'Captured Fields'}
        </h2>
        {mode === 'policy' && policySummary ? (
          <PolicyFields policySummary={policySummary} onFieldClick={onFieldClick} />
        ) : (
          <CapturedFields profile={profile} confidence={confidence} onFieldClick={onFieldClick} />
        )}
      </div>

      {/* Missing Fields Section */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Missing Fields</h2>
        <MissingFields
          missingFields={missingFields}
          capturedCount={capturedCount}
          totalRequired={totalRequired}
          onFieldClick={onFieldClick}
        />
      </div>

      {/* Mode-specific panels will be added here */}
      {mode === 'intake' && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Routing Status</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Routing information will appear here when enough data is captured...
            </p>
          </div>
        </div>
      )}

      {mode === 'policy' && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Savings Dashboard</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Savings opportunities will appear here after policy analysis...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
