/**
 * Compliance Panel Component
 *
 * Displays state/product-specific disclaimers based on discovered fields.
 * Positioned directly below notes input field for proximity to broker attention.
 * Updates dynamically as state/product discovered during conversation.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserProfile } from '@repo/shared'

interface CompliancePanelProps {
  mode: 'intake' | 'policy'
  profile: UserProfile
}

export function CompliancePanel({ mode, profile }: CompliancePanelProps) {
  // Stub compliance disclaimers - will be replaced with backend compliance filter in Story 1.7
  const getDisclaimers = (): string[] => {
    const disclaimers: string[] = []

    if (profile.state) {
      if (profile.state === 'CA') {
        disclaimers.push(
          'California: This quote is an estimate only. Rates subject to underwriting approval.'
        )
      } else if (profile.state === 'TX') {
        disclaimers.push(
          'Texas: Rates are estimates and may vary based on final underwriting review.'
        )
      } else if (profile.state === 'FL') {
        disclaimers.push(
          'Florida: Quote estimates are preliminary. Final rates determined by carrier underwriting.'
        )
      } else {
        disclaimers.push(
          `${profile.state}: This quote is an estimate only. Rates subject to underwriting approval.`
        )
      }
    }

    if (profile.productLine) {
      if (profile.productLine === 'auto') {
        disclaimers.push(
          'Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.'
        )
      } else if (profile.productLine === 'home') {
        disclaimers.push(
          'Home Insurance: Property details and location impact rates. Underwriting required.'
        )
      }
    }

    if (disclaimers.length === 0) {
      return [
        'Compliance: Disclaimers will appear here as state and product information is captured.',
      ]
    }

    return disclaimers
  }

  const disclaimers = getDisclaimers()
  const borderColor =
    mode === 'intake'
      ? 'border-blue-500 dark:border-blue-400'
      : 'border-purple-500 dark:border-purple-400'

  return (
    <Card className={`${borderColor} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Compliance Disclaimers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {disclaimers.map((disclaimer) => (
          <p key={disclaimer} className="text-xs text-gray-700 dark:text-gray-300">
            {disclaimer}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
