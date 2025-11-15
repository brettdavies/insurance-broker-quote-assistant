/**
 * Sidebar Component
 *
 * Adaptive sidebar container that displays captured fields, missing fields,
 * and mode-specific panels (routing status for intake, savings dashboard for policy).
 */

import { Button } from '@/components/ui/button'
import type { PolicyAnalysisResult, PolicySummary, UserProfile } from '@repo/shared'
import { CapturedFields } from './CapturedFields'
import { type MissingField, MissingFields } from './MissingFields'
import { PolicyFields } from './PolicyFields'
import { SavingsDashboard } from './SavingsDashboard'

interface SidebarProps {
  mode: 'intake' | 'policy'
  profile: UserProfile
  missingFields: MissingField[]
  capturedCount: number
  totalRequired: number
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  policySummary?: PolicySummary
  confidence?: Record<string, number>
  policyAnalysisResult?: PolicyAnalysisResult
  isAnalyzing?: boolean
  inferredFields?: Partial<UserProfile>
  inferenceReasons?: Record<string, string>
  onDismiss?: (fieldKey: string) => void
}

export function Sidebar({
  mode,
  profile,
  missingFields,
  capturedCount,
  totalRequired,
  onFieldClick,
  policySummary,
  confidence,
  policyAnalysisResult,
  isAnalyzing = false,
  inferredFields,
  inferenceReasons,
  onDismiss,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col space-y-3 overflow-y-auto bg-gray-100 p-3 dark:bg-gray-800">
      {/* Captured Fields Section - Moved to top */}
      <div>
        <h2 className="mb-1.5 text-base font-semibold">
          {mode === 'policy' ? 'Policy Fields' : 'Captured Fields'}
        </h2>
        {mode === 'policy' && policySummary ? (
          <PolicyFields policySummary={policySummary} onFieldClick={onFieldClick} />
        ) : (
          <CapturedFields
            profile={profile}
            confidence={confidence}
            onFieldClick={onFieldClick}
            inferredFields={inferredFields}
            inferenceReasons={inferenceReasons}
            onDismiss={onDismiss}
          />
        )}
      </div>

      {/* Missing Fields Section */}
      <div>
        <h2 className="mb-1.5 text-base font-semibold">Missing Fields</h2>
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
          <h2 className="mb-1.5 text-base font-semibold">Routing Status</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Routing information will appear here when enough data is captured...
            </p>
          </div>
        </div>
      )}

      {mode === 'policy' && (
        <div>
          {isAnalyzing ? (
            <>
              <h2 className="mb-1.5 text-base font-semibold">Savings Dashboard</h2>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analyzing policy for savings opportunities...
                </p>
              </div>
            </>
          ) : policyAnalysisResult ? (
            <SavingsDashboard analysisResult={policyAnalysisResult} />
          ) : (
            <>
              <h2 className="mb-1.5 text-base font-semibold">Savings Dashboard</h2>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Savings opportunities will appear here after policy analysis...
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
