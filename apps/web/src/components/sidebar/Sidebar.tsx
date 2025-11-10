/**
 * Sidebar Component
 *
 * Adaptive sidebar container that displays captured fields, missing fields,
 * and mode-specific panels (routing status for intake, savings dashboard for policy).
 */

import type { UserProfile } from '@repo/shared'
import { CapturedFields } from './CapturedFields'
import { type MissingField, MissingFields } from './MissingFields'

interface SidebarProps {
  mode: 'intake' | 'policy'
  profile: UserProfile
  missingFields: MissingField[]
  capturedCount: number
  totalRequired: number
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
}

export function Sidebar({
  mode,
  profile,
  missingFields,
  capturedCount,
  totalRequired,
  onFieldClick,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto bg-gray-100 p-4 dark:bg-gray-800">
      {/* Captured Fields Section */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Captured Fields</h2>
        <CapturedFields profile={profile} onFieldClick={onFieldClick} />
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
