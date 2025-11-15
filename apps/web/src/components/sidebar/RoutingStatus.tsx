/**
 * Routing Status Component
 *
 * Displays routing decision information including primary carrier,
 * eligible carriers, confidence, and rationale.
 * Reuses Card components for consistency with CompliancePanel.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RouteDecision } from '@repo/shared'

interface RoutingStatusProps {
  route: RouteDecision | null
  mode: 'intake' | 'policy'
}

export function RoutingStatus({ route, mode }: RoutingStatusProps) {
  // Only show in intake mode
  if (mode !== 'intake') {
    return null
  }

  // Show placeholder if no route decision yet
  if (!route) {
    return (
      <Card className="border-2 border-blue-500 dark:border-blue-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Routing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Routing information will appear here when enough data is captured...
          </p>
        </CardContent>
      </Card>
    )
  }

  const { primaryCarrier, eligibleCarriers, confidence, rationale, tiedCarriers } = route

  // Format confidence as percentage
  const confidencePercent = Math.round(confidence * 100)

  return (
    <Card className="border-2 border-blue-500 dark:border-blue-400">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Routing Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary Carrier */}
        {primaryCarrier && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Primary Carrier
              </span>
              {confidence > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {confidencePercent}% confidence
                </span>
              )}
            </div>
            <div className="rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
              {primaryCarrier}
            </div>
          </div>
        )}

        {/* Eligible Carriers */}
        {eligibleCarriers && eligibleCarriers.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              Eligible Carriers ({eligibleCarriers.length})
            </div>
            <div className="space-y-1">
              {eligibleCarriers.map((carrier) => (
                <div
                  key={carrier}
                  className={`rounded-md px-3 py-1.5 text-xs ${
                    carrier === primaryCarrier
                      ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                      : 'bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'
                  }`}
                >
                  {carrier}
                  {carrier === primaryCarrier && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                  {tiedCarriers?.includes(carrier) && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Tied)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rationale */}
        {rationale && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              Rationale
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{rationale}</p>
          </div>
        )}

        {/* No eligible carriers message */}
        {(!eligibleCarriers || eligibleCarriers.length === 0) && (
          <div className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            {rationale || 'No eligible carriers found. Please check your profile information.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
