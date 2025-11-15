/**
 * useExportHandlers Hook
 *
 * Manages export and copy operations for prefill packets and savings pitches.
 *
 * Single Responsibility: Export/copy logic only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import { copySavingsPitchToClipboard } from '@/lib/clipboard-utils'
import { exportSavingsPitch } from '@/lib/export-utils'
import { logDebug, logError, logInfo } from '@/lib/logger'
import {
  generatePrefillFilename,
  getPrefillPacket,
  handleCopy,
  handleExport,
} from '@/lib/prefill-utils'
import type { IntakeResult, PolicyAnalysisResult, UserProfile } from '@repo/shared'
import { useCallback } from 'react'

interface UseExportHandlersParams {
  profile: UserProfile
  latestIntakeResult: IntakeResult | null
  policyAnalysisResult?: PolicyAnalysisResult
  mode: 'intake' | 'policy'
  toast: typeof ToastFn
}

export function useExportHandlers({
  profile,
  latestIntakeResult,
  policyAnalysisResult,
  mode,
  toast,
}: UseExportHandlersParams) {
  const handleExportCommand = useCallback(async () => {
    try {
      if (mode === 'policy' && policyAnalysisResult) {
        // Export savings pitch in policy mode
        exportSavingsPitch(policyAnalysisResult)
        void logInfo('[Decision Trace] Export action', {
          timestamp: new Date().toISOString(),
          action: 'export',
          type: 'savings_pitch',
          summary: {
            opportunities: policyAnalysisResult.opportunities.length,
            bundleOptions: policyAnalysisResult.bundleOptions.length,
            deductibleOptimizations: policyAnalysisResult.deductibleOptimizations.length,
            carrier: policyAnalysisResult.currentPolicy.carrier,
            state: policyAnalysisResult.currentPolicy.state,
            product: policyAnalysisResult.currentPolicy.productType,
          },
        })
        toast({
          title: 'Export successful',
          description: 'Savings pitch exported as JSON',
          duration: 3000,
        })
      } else {
        // Export prefill packet in intake mode
        const prefillPacket = await getPrefillPacket(latestIntakeResult, profile)
        handleExport(prefillPacket)
        toast({
          title: 'Export successful',
          description: `Downloaded ${generatePrefillFilename(prefillPacket)}`,
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive',
        duration: 5000,
      })
    }
  }, [profile, latestIntakeResult, policyAnalysisResult, mode, toast])

  const handleCopyCommand = useCallback(async () => {
    try {
      if (mode === 'policy' && policyAnalysisResult) {
        // Copy savings pitch in policy mode
        await copySavingsPitchToClipboard(policyAnalysisResult)
        void logInfo('[Decision Trace] Copy action', {
          timestamp: new Date().toISOString(),
          action: 'copy',
          type: 'savings_pitch',
          summary: {
            opportunities: policyAnalysisResult.opportunities.length,
            bundleOptions: policyAnalysisResult.bundleOptions.length,
            deductibleOptimizations: policyAnalysisResult.deductibleOptimizations.length,
            carrier: policyAnalysisResult.currentPolicy.carrier,
            state: policyAnalysisResult.currentPolicy.state,
            product: policyAnalysisResult.currentPolicy.productType,
          },
        })
        toast({
          title: 'Copied to clipboard',
          description: 'Savings pitch copied to clipboard',
          duration: 3000,
        })
      } else {
        // Copy prefill packet in intake mode
        await logDebug('Copy command: Starting prefill packet fetch...')
        const prefillPacket = await getPrefillPacket(latestIntakeResult, profile)
        await logDebug('Copy command: Prefill packet received', { prefillPacket })
        await handleCopy(prefillPacket)
        await logDebug('Copy command: Success - showing success toast')
        toast({
          title: 'Copied to clipboard',
          description: 'Prefill packet JSON copied to clipboard',
          duration: 3000,
        })
      }
    } catch (error) {
      void logError('Copy command error', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard'
      await logDebug('Copy command: Showing error toast with message', { errorMessage })
      toast({
        title: 'Copy failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
    }
  }, [profile, latestIntakeResult, policyAnalysisResult, mode, toast])

  return {
    handleExportCommand,
    handleCopyCommand,
  }
}
