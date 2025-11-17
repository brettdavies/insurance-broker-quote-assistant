import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PolicyAnalysisResult } from '@repo/shared'
import { copySavingsPitchToClipboard } from '../clipboard-utils'

describe('clipboard-utils', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    global.navigator = {
      clipboard: {
        writeText: mock(async () => {}),
      },
    } as unknown as Navigator
  })

  const createMockPolicyAnalysisResult = (
    overrides?: Partial<PolicyAnalysisResult>
  ): PolicyAnalysisResult => ({
    currentPolicy: {
      carrier: 'GEICO',
      state: 'CA',
      productType: 'auto',
      premiums: {
        annual: 1200,
      },
      ...overrides?.currentPolicy,
    },
    opportunities: [
      {
        discount: 'Multi-Policy Bundle',
        percentage: 15,
        annualSavings: 180,
        requires: ['Add home insurance policy'],
        citation: {
          id: 'disc_123',
          type: 'discount',
          carrier: 'GEICO',
          file: 'knowledge_pack/carriers/geico.json',
        },
        confidenceScore: 85,
        validationDetails: {
          rulesEvaluated: [],
          missingData: [],
          eligibilityChecks: {
            discountFound: true,
            eligibilityValidated: true,
            savingsCalculated: true,
            stackingValidated: false,
          },
        },
        requiresDocumentation: false,
        validatedAt: new Date().toISOString(),
      },
    ],
    bundleOptions: [],
    deductibleOptimizations: [],
    pitch: 'Test pitch with savings opportunities',
    complianceValidated: true,
    ...overrides,
  })

  describe('copySavingsPitchToClipboard', () => {
    it('should format and copy savings pitch text to clipboard', async () => {
      const result = createMockPolicyAnalysisResult()
      const writeTextMock = global.navigator.clipboard.writeText as ReturnType<typeof mock>

      await copySavingsPitchToClipboard(result)

      expect(writeTextMock).toHaveBeenCalled()
      const copiedText = writeTextMock.mock.calls[0]?.[0] as string
      expect(copiedText).toContain('# Savings Opportunities Analysis')
      expect(copiedText).toContain('## Current Policy')
      expect(copiedText).toContain('GEICO')
      expect(copiedText).toContain('CA')
      expect(copiedText).toContain('## Discounts')
      expect(copiedText).toContain('Multi-Policy Bundle')
      expect(copiedText).toContain('$180/year')
      expect(copiedText).toContain('85%')
      expect(copiedText).toContain('## Important Disclaimers')
    })

    it('should include all opportunity categories in formatted text', async () => {
      const result = createMockPolicyAnalysisResult({
        bundleOptions: [
          {
            product: 'home',
            estimatedSavings: 200,
            requiredActions: ['Add home insurance policy'],
            citation: {
              id: 'bundle_123',
              type: 'bundle',
              carrier: 'GEICO',
              file: 'knowledge_pack/carriers/geico.json',
            },
          },
        ],
        deductibleOptimizations: [
          {
            currentDeductible: 500,
            suggestedDeductible: 1000,
            estimatedSavings: 150,
            premiumImpact: -150,
            citation: {
              id: 'ded_123',
              type: 'deductible',
              carrier: 'GEICO',
              file: 'knowledge_pack/carriers/geico.json',
            },
          },
        ],
      })
      const writeTextMock = global.navigator.clipboard.writeText as ReturnType<typeof mock>

      await copySavingsPitchToClipboard(result)

      const copiedText = writeTextMock.mock.calls[0]?.[0] as string
      expect(copiedText).toContain('## Bundle Opportunities')
      expect(copiedText).toContain('Add home Policy')
      expect(copiedText).toContain('## Coverage Adjustments')
      expect(copiedText).toContain('Deductible Optimization')
      expect(copiedText).toContain('$500 → **Suggested:** $1000')
    })

    it('should handle clipboard API errors gracefully', async () => {
      const result = createMockPolicyAnalysisResult()
      global.navigator.clipboard.writeText = mock(async () => {
        throw new Error('Clipboard API unavailable')
      }) as unknown as typeof navigator.clipboard.writeText

      await expect(copySavingsPitchToClipboard(result)).rejects.toThrow('Copy failed')
    })
  })
})
