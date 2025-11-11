/**
 * Compliance Panel Component
 *
 * Displays state/product-specific disclaimers from backend compliance filter.
 * Positioned directly below notes input field for proximity to broker attention.
 * Updates dynamically as state/product discovered during conversation.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CompliancePanelProps {
  mode: 'intake' | 'policy'
  disclaimers?: string[]
}

export function CompliancePanel({ mode, disclaimers = [] }: CompliancePanelProps) {
  // Use disclaimers from backend, or show placeholder if none provided
  const displayDisclaimers =
    disclaimers.length > 0
      ? disclaimers
      : ['Compliance: Disclaimers will appear here as state and product information is captured.']
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
        {displayDisclaimers.map((disclaimer) => (
          <p key={disclaimer} className="text-xs text-gray-700 dark:text-gray-300">
            {disclaimer}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
