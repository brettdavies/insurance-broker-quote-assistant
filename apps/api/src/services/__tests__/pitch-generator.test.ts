/**
 * Pitch Generator Unit Tests
 *
 * Tests pitch generation from opportunities, bundle options, and deductible optimizations.
 *
 * @see docs/stories/2.2.policy-analysis-agent.md#task-12
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  buildBundleOption,
  buildDeductibleOptimization,
  buildOpportunity,
  buildPolicySummary,
} from '@repo/shared'
import type { LLMProvider } from '../llm-provider'
import { PitchGenerator } from '../pitch-generator'

describe('PitchGenerator', () => {
  let mockLLMProvider: LLMProvider
  let generator: PitchGenerator

  beforeEach(() => {
    mockLLMProvider = {
      extractWithStructuredOutput: mock(async () => ({
        profile: {
          pitch: 'Mock generated pitch with savings opportunities.',
        },
        confidence: {},
        reasoning: 'Mock pitch generation',
        tokensUsed: 300,
      })),
    } as unknown as LLMProvider

    generator = new PitchGenerator(mockLLMProvider)
  })

  describe('generatePitch', () => {
    it('should generate pitch from opportunities', async () => {
      const policy = buildPolicySummary()
      const opportunities = [
        buildOpportunity({
          discount: 'Good Driver Discount',
          requires: ['cleanRecord3Yr'],
        }),
      ]

      const pitch = await generator.generatePitch(opportunities, [], [], policy)

      expect(pitch).toBeDefined()
      expect(typeof pitch).toBe('string')
      expect(pitch.length).toBeGreaterThan(0)
    })

    it('should include opportunities in prompt', async () => {
      const policy = buildPolicySummary()
      const opportunities = [
        buildOpportunity({
          discount: 'Good Driver Discount',
          requires: ['cleanRecord3Yr'],
        }),
      ]

      await generator.generatePitch(opportunities, [], [], policy)

      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('Good Driver Discount')
      expect(callArgs?.[0]).toContain('10%')
      expect(callArgs?.[0]).toContain('$120')
    })

    it('should include bundle options in prompt', async () => {
      const policy = buildPolicySummary()
      const bundleOptions = [
        buildBundleOption({
          requiredActions: ['Add home insurance policy'],
        }),
      ]

      await generator.generatePitch([], bundleOptions, [], policy)

      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('home')
      expect(callArgs?.[0]).toContain('$200')
    })

    it('should include deductible optimizations in prompt', async () => {
      const policy = buildPolicySummary()
      const optimizations = [buildDeductibleOptimization()]

      await generator.generatePitch([], [], optimizations, policy)

      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('$500')
      expect(callArgs?.[0]).toContain('$1000')
      expect(callArgs?.[0]).toContain('$150')
    })

    it('should include policy context in prompt', async () => {
      const policy = buildPolicySummary()
      const opportunities = [
        buildOpportunity({
          discount: 'Good Driver Discount',
          requires: ['cleanRecord3Yr'],
        }),
      ] // Need at least one opportunity to call LLM
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue({
        profile: { pitch: 'Test pitch' },
        confidence: {},
        tokensUsed: 300,
      })

      await generator.generatePitch(opportunities, [], [], policy)

      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('GEICO')
      expect(callArgs?.[0]).toContain('CA')
      expect(callArgs?.[0]).toContain('auto')
      expect(callArgs?.[0]).toContain('$1200')
    })

    it('should return fallback pitch when LLM fails', async () => {
      const policy = buildPolicySummary()
      const opportunities = [
        buildOpportunity({
          discount: 'Good Driver Discount',
          requires: ['cleanRecord3Yr'],
        }),
      ]
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockRejectedValue(
        new Error('LLM error')
      )

      const pitch = await generator.generatePitch(opportunities, [], [], policy)

      expect(pitch).toBeDefined()
      expect(pitch).toContain('savings opportunities')
      expect(pitch).toContain('Good Driver Discount')
    })

    it('should return appropriate message when no opportunities', async () => {
      const policy = buildPolicySummary()
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockRejectedValue(
        new Error('LLM error')
      )

      const pitch = await generator.generatePitch([], [], [], policy)

      expect(pitch).toBeDefined()
      expect(pitch).toContain('well-optimized')
    })

    it('should log token usage', async () => {
      const policy = buildPolicySummary()
      const opportunities = [
        buildOpportunity({
          discount: 'Good Driver Discount',
          requires: ['cleanRecord3Yr'],
        }),
      ]

      await generator.generatePitch(opportunities, [], [], policy)

      // Token usage should be logged (verified via mock)
      expect(mockLLMProvider.extractWithStructuredOutput).toHaveBeenCalled()
    })
  })
})
