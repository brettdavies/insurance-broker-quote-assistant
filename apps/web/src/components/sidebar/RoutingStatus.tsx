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

  const { primaryCarrier, eligibleCarriers, confidence, rationale, tiedCarriers, matchScores } =
    route

  // Confidence is already 0-100 integer percentage from backend (overall routing confidence)
  // Match scores are also 0-100 integer percentages (carrier-specific match quality)

  return (
    <Card className="border-2 border-blue-500 dark:border-blue-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Routing Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Confidence and Primary Carrier - Compact Horizontal Layout */}
        <div className="space-y-1.5">
          {confidence > 0 && (
            <div className="text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Routing Confidence:{' '}
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{confidence}%</span>
            </div>
          )}

          {primaryCarrier && (
            <div className="flex items-center justify-between rounded-md bg-blue-50 px-2.5 py-1.5 text-xs dark:bg-blue-900/20">
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {primaryCarrier}
              </span>
              {matchScores?.[primaryCarrier] !== undefined && (
                <span className="ml-2 font-medium text-blue-700 dark:text-blue-300">
                  {matchScores[primaryCarrier]}% match
                </span>
              )}
            </div>
          )}
        </div>

        {/* Other Eligible Carriers - Compact Grid Layout */}
        {eligibleCarriers && eligibleCarriers.filter((c) => c !== primaryCarrier).length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              Other Eligible Carriers ({eligibleCarriers.filter((c) => c !== primaryCarrier).length}
              )
            </div>
            <div className="grid grid-cols-1 gap-1">
              {eligibleCarriers
                .filter((carrier) => carrier !== primaryCarrier)
                .map((carrier) => {
                  const matchScore = matchScores?.[carrier]
                  return (
                    <div
                      key={carrier}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
                    >
                      <span>
                        {carrier}
                        {tiedCarriers?.includes(carrier) && (
                          <span className="ml-1.5 text-gray-500 dark:text-gray-400">(Tied)</span>
                        )}
                      </span>
                      {matchScore !== undefined && (
                        <span className="ml-2 font-medium text-gray-600 dark:text-gray-400">
                          {matchScore}% match
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Rationale - Compact */}
        {rationale && (
          <div className="pt-0.5">
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{rationale}</p>
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
