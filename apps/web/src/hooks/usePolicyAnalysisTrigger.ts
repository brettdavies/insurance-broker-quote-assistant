/**
 * usePolicyAnalysisTrigger Hook
 *
 * Triggers policy analysis when policySummary is available in policy mode.
 *
 * Single Responsibility: Policy analysis triggering only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import { logError } from '@/lib/logger'
import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { useEffect } from 'react'

interface UsePolicyAnalysisTriggerParams {
  mode: 'intake' | 'policy'
  policySummary?: PolicySummary
  policyAnalysisMutation: {
    isPending: boolean
    mutate: (
      request: { policySummary: PolicySummary },
      callbacks: {
        onSuccess: (result: PolicyAnalysisResult) => void
        onError: (error: Error) => void
      }
    ) => void
  }
  setPolicyAnalysisResult: (result: PolicyAnalysisResult) => void
  toast: typeof ToastFn
}

export function usePolicyAnalysisTrigger({
  mode,
  policySummary,
  policyAnalysisMutation,
  setPolicyAnalysisResult,
  toast,
}: UsePolicyAnalysisTriggerParams) {
  useEffect(() => {
    if (mode === 'policy' && policySummary && !policyAnalysisMutation.isPending) {
      policyAnalysisMutation.mutate(
        { policySummary },
        {
          onSuccess: (result) => {
            setPolicyAnalysisResult(result)
          },
          onError: (error) => {
            void logError('Policy analysis failed', error)
            toast({
              title: 'Analysis failed',
              description: error instanceof Error ? error.message : 'Failed to analyze policy',
              variant: 'destructive',
              duration: 5000,
            })
          },
        }
      )
    }
  }, [mode, policySummary, policyAnalysisMutation, setPolicyAnalysisResult, toast])
}
