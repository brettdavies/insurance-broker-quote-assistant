import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PolicyAnalysisResult } from '@repo/shared'
import { Info } from 'lucide-react'

interface SavingsDashboardProps {
  analysisResult: PolicyAnalysisResult
}

/**
 * Get priority color based on savings amount
 */
function getPriorityColor(savings: number): string {
  if (savings > 200) {
    return 'border-green-500' // High-impact
  }
  if (savings >= 50) {
    return 'border-yellow-500' // Medium-impact
  }
  return 'border-gray-400' // Low-impact
}

/**
 * Format savings amount for display
 */
function formatSavings(amount: number): string {
  return `$${amount.toFixed(0)}/yr`
}

/**
 * Format citation tooltip text
 */
function formatCitation(citation: { id: string; file: string }): string {
  return `${citation.id} - ${citation.file}`
}

export function SavingsDashboard({ analysisResult }: SavingsDashboardProps) {
  const { opportunities, bundleOptions, deductibleOptimizations } = analysisResult

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Savings Dashboard</h2>

      <TooltipProvider>
        <Accordion type="multiple" className="w-full">
          {/* Discounts Section */}
          {opportunities.length > 0 && (
            <AccordionItem value="discounts" className="border-green-200 dark:border-green-800">
              <AccordionTrigger className="text-base font-semibold text-green-700 dark:text-green-400">
                Discounts ({opportunities.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {opportunities.map((opportunity, index) => (
                    <Card
                      key={opportunity.citation.id || index}
                      className={getPriorityColor(opportunity.annualSavings)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold">{opportunity.discount}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatSavings(opportunity.annualSavings)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs italic text-gray-500">
                                {opportunity.confidenceScore}% confidence
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                    aria-label="Citation"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{formatCitation(opportunity.citation)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          {opportunity.requires && opportunity.requires.length > 0 && (
                            <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                              {opportunity.requires.map((req) => (
                                <li key={req}>{req}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Bundles Section */}
          {bundleOptions.length > 0 && (
            <AccordionItem value="bundles" className="border-purple-200 dark:border-purple-800">
              <AccordionTrigger className="text-base font-semibold text-purple-700 dark:text-purple-400">
                Bundles ({bundleOptions.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {bundleOptions.map((bundle, index) => (
                    <Card
                      key={bundle.citation.id || index}
                      className={getPriorityColor(bundle.estimatedSavings)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold">
                                Add {bundle.product} policy
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatSavings(bundle.estimatedSavings)}
                              </p>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                  aria-label="Citation"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{formatCitation(bundle.citation)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          {bundle.requiredActions && bundle.requiredActions.length > 0 && (
                            <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                              {bundle.requiredActions.map((action) => (
                                <li key={action}>{action}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Coverage Adjustments Section */}
          {deductibleOptimizations.length > 0 && (
            <AccordionItem
              value="coverage-adjustments"
              className="border-blue-200 dark:border-blue-800"
            >
              <AccordionTrigger className="text-base font-semibold text-blue-700 dark:text-blue-400">
                Coverage Adjustments ({deductibleOptimizations.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {deductibleOptimizations.map((optimization, index) => (
                    <Card
                      key={optimization.citation.id || index}
                      className={getPriorityColor(optimization.estimatedSavings)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold">Deductible Optimization</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatSavings(optimization.estimatedSavings)} ($
                                {optimization.currentDeductible} → $
                                {optimization.suggestedDeductible})
                              </p>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                  aria-label="Citation"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{formatCitation(optimization.citation)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Empty State */}
          {opportunities.length === 0 &&
            bundleOptions.length === 0 &&
            deductibleOptimizations.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No additional savings opportunities identified.
                </p>
              </div>
            )}
        </Accordion>
      </TooltipProvider>
    </div>
  )
}
