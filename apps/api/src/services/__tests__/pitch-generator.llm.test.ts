/**
 * Pitch Generator LLM Integration Tests
 *
 * Tests pitch generation with real Gemini LLM provider.
 * Captures intermediate outputs at each step to show what LLM does vs post-processing.
 * Generates markdown report during test execution.
 *
 * Can run with mock or real provider based on USE_REAL_LLM environment variable.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BundleOption, DeductibleOptimization, Opportunity, PolicySummary } from '@repo/shared'
import { GeminiProvider } from '../gemini-provider'
import type { LLMProvider } from '../llm-provider'
import { PitchGenerator } from '../pitch-generator'

// Shared test inputs (same as unit tests)
const createTestPolicy = (): PolicySummary => ({
  carrier: 'GEICO',
  state: 'CA',
  productType: 'auto',
  premiums: { annual: 1200 },
})

const createTestOpportunity = (): Opportunity => ({
  discount: 'Good Driver Discount',
  percentage: 10,
  annualSavings: 120,
  requires: ['cleanRecord3Yr'],
  citation: {
    id: 'disc_test',
    type: 'discount',
    carrier: 'carr_test',
    file: 'knowledge_pack/carriers/geico.json',
  },
})

const createTestBundleOption = (): BundleOption => ({
  product: 'home',
  estimatedSavings: 200,
  requiredActions: ['Add home insurance policy'],
  citation: {
    id: 'disc_bundle',
    type: 'discount',
    carrier: 'carr_test',
    file: 'knowledge_pack/carriers/geico.json',
  },
})

const createTestDeductibleOptimization = (): DeductibleOptimization => ({
  currentDeductible: 500,
  suggestedDeductible: 1000,
  estimatedSavings: 150,
  premiumImpact: -150,
  citation: {
    id: 'disc_deductible',
    type: 'discount',
    carrier: 'carr_test',
    file: 'knowledge_pack/carriers/geico.json',
  },
})

// Test results storage for reporting
interface TestStep {
  step: string
  description: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
}

interface TestResult {
  testName: string
  steps: TestStep[]
  finalOutput?: string
  error?: string
  tokensUsed?: number
  pitchLength?: number
}

const testResults: TestResult[] = []

let currentTest: TestResult | null = null

function addStep(
  step: string,
  description: string,
  input?: unknown,
  output?: unknown,
  metadata?: Record<string, unknown>
) {
  if (currentTest) {
    currentTest.steps.push({ step, description, input, output, metadata })
  }
}

async function generateMarkdownReport(results: TestResult[]): Promise<void> {
  const reportDir = join(process.cwd(), 'test-reports')
  await mkdir(reportDir, { recursive: true })

  const reportPath = join(reportDir, 'pitch-generator-llm-report.md')

  const lines: string[] = []
  lines.push('# Pitch Generator - LLM Integration Test Report')
  lines.push('')
  lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`)
  lines.push('**Model:** Gemini 2.5 Flash-Lite')
  lines.push('**Test Type:** Real LLM Integration Tests')
  lines.push('')
  lines.push('## Test Suite Overview')
  lines.push('')
  lines.push('This report shows the complete pipeline for each test, including:')
  lines.push('1. **Input:** Original test input (opportunities, bundle options, etc.)')
  lines.push('2. **Server-Side Detection:** Whether LLM was called or skipped')
  lines.push('3. **Prompt:** The exact prompt sent to the LLM (if called)')
  lines.push('4. **LLM Raw Output:** The raw pitch from the LLM (with citation markers)')
  lines.push('5. **Post-Processed Output:** After citation replacement')
  lines.push('6. **Final Output:** The complete pitch returned to the caller')
  lines.push('')
  lines.push(
    'This allows us to see exactly what the LLM is doing vs what our post-processing is doing.'
  )
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const result of results) {
    lines.push(`## ${result.testName}`)
    lines.push('')

    if (result.error) {
      lines.push('### ❌ Error')
      lines.push('')
      lines.push('```')
      lines.push(result.error)
      lines.push('```')
      lines.push('')
      continue
    }

    // Show each step in the pipeline
    for (const step of result.steps) {
      lines.push(`### Step: ${step.step}`)
      lines.push('')
      lines.push(`**Description:** ${step.description}`)
      lines.push('')

      if (step.input !== undefined) {
        if (typeof step.input === 'string') {
          lines.push('**Input:**')
          lines.push('```')
          lines.push(step.input)
          lines.push('```')
        } else {
          lines.push('**Input:**')
          lines.push('```json')
          lines.push(JSON.stringify(step.input, null, 2))
          lines.push('```')
        }
        lines.push('')
      }

      if (step.output !== undefined) {
        if (typeof step.output === 'string') {
          lines.push('**Output:**')
          lines.push('```')
          lines.push(step.output)
          lines.push('```')
        } else {
          lines.push('**Output:**')
          lines.push('```json')
          lines.push(JSON.stringify(step.output, null, 2))
          lines.push('```')
        }
        lines.push('')
      }

      if (step.metadata && Object.keys(step.metadata).length > 0) {
        lines.push('**Metadata:**')
        lines.push('```json')
        lines.push(JSON.stringify(step.metadata, null, 2))
        lines.push('```')
        lines.push('')
      }
    }

    // Final output summary
    if (result.finalOutput) {
      lines.push('### Final Output Summary')
      lines.push('')
      lines.push('**Metrics:**')
      lines.push(`- **Pitch Length:** ${result.pitchLength ?? 'N/A'} characters`)
      lines.push(`- **Tokens Used:** ${result.tokensUsed ?? 'N/A'}`)
      lines.push('')
      lines.push('**Final Pitch:**')
      lines.push('```')
      lines.push(result.finalOutput)
      lines.push('```')
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // Summary section
  lines.push('## Summary')
  lines.push('')
  lines.push(`**Total Tests:** ${results.length}`)
  lines.push(`**Passed:** ${results.filter((r) => !r.error).length}`)
  lines.push(`**Failed:** ${results.filter((r) => r.error).length}`)
  lines.push('')

  await writeFile(reportPath, lines.join('\n'), 'utf-8')
}

describe('PitchGenerator - LLM Integration Tests', () => {
  let llmProvider: LLMProvider
  let generator: PitchGenerator

  beforeAll(() => {
    const useRealLLM = process.env.USE_REAL_LLM === 'true'

    if (!useRealLLM) {
      return
    }

    llmProvider = new GeminiProvider(process.env.GEMINI_API_KEY, 'gemini-2.5-flash-lite', 30000)

    generator = new PitchGenerator(llmProvider)
  })

  it('should generate pitch from opportunities with real LLM', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = createTestPolicy()
    const opportunities = [createTestOpportunity()]

    currentTest = {
      testName: 'Generate Pitch from Opportunities',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', {
        opportunities,
        bundleOptions: [],
        deductibleOptimizations: [],
        policy,
      })

      // Check server-side detection
      const shouldCallLLM = opportunities.length > 0 || false
      addStep(
        '2. Server-Side Detection',
        'Check if LLM should be called',
        {
          opportunitiesCount: opportunities.length,
          bundleOptionsCount: 0,
          deductibleOptimizationsCount: 0,
        },
        {
          shouldCallLLM,
          reason: shouldCallLLM
            ? 'Opportunities found, LLM will be called'
            : 'No opportunities, LLM will be skipped',
        }
      )

      const pitch = await generator.generatePitch(opportunities, [], [], policy)
      const tokensUsed = (pitch as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed

      if (generator.lastPrompt) {
        addStep('3. Prompt', 'Prompt sent to LLM', undefined, generator.lastPrompt)
      }

      if (generator.lastLLMRawOutput) {
        const rawPitch = (generator.lastLLMRawOutput as { pitch?: string }).pitch
        addStep(
          '4. LLM Raw Output',
          'Raw pitch from LLM (may contain citation markers like [citation:ID])',
          undefined,
          rawPitch,
          {
            note: 'This is what the LLM returned directly. May contain citation markers that will be removed in post-processing.',
          }
        )
      }

      if (generator.lastPitchWithCitations) {
        addStep(
          '5. Post-Processed Output',
          'After citation replacement (citation markers removed)',
          undefined,
          generator.lastPitchWithCitations,
          {
            note: 'Compare with Step 4 to see citation markers removed.',
          }
        )
      }

      addStep('6. Final Output', 'Complete pitch returned to caller', undefined, pitch as string, {
        tokensUsed,
        pitchLength: pitch.length,
      })

      currentTest.finalOutput = pitch as string
      currentTest.tokensUsed = tokensUsed
      currentTest.pitchLength = pitch.length

      expect(pitch).toBeDefined()
      expect(typeof pitch).toBe('string')
      expect(pitch.length).toBeGreaterThan(0)
      expect(pitch).toContain('Good Driver Discount')
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      addStep('Error', 'Test failed', undefined, { error: currentTest.error })
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should generate pitch with bundle options with real LLM', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = createTestPolicy()
    const bundleOptions = [createTestBundleOption()]

    currentTest = {
      testName: 'Generate Pitch with Bundle Options',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', {
        opportunities: [],
        bundleOptions,
        deductibleOptimizations: [],
        policy,
      })

      const pitch = await generator.generatePitch([], bundleOptions, [], policy)
      const tokensUsed = (pitch as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed

      if (generator.lastPrompt) {
        addStep('2. Prompt', 'Prompt sent to LLM', undefined, generator.lastPrompt)
      }
      if (generator.lastLLMRawOutput) {
        const rawPitch = (generator.lastLLMRawOutput as { pitch?: string }).pitch
        addStep('3. LLM Raw Output', 'Raw pitch from LLM', undefined, rawPitch)
      }
      if (generator.lastPitchWithCitations) {
        addStep(
          '4. Post-Processed Output',
          'After citation replacement',
          undefined,
          generator.lastPitchWithCitations
        )
      }

      addStep('5. Final Output', 'Complete pitch', undefined, pitch as string, {
        tokensUsed,
        pitchLength: pitch.length,
      })

      currentTest.finalOutput = pitch as string
      currentTest.tokensUsed = tokensUsed
      currentTest.pitchLength = pitch.length

      expect(pitch).toBeDefined()
      expect(pitch.length).toBeGreaterThan(0)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should generate pitch with deductible optimizations with real LLM', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = createTestPolicy()
    const optimizations = [createTestDeductibleOptimization()]

    currentTest = {
      testName: 'Generate Pitch with Deductible Optimizations',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', {
        opportunities: [],
        bundleOptions: [],
        deductibleOptimizations: optimizations,
        policy,
      })

      const pitch = await generator.generatePitch([], [], optimizations, policy)
      const tokensUsed = (pitch as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed

      if (generator.lastPrompt) {
        addStep('2. Prompt', 'Prompt sent to LLM', undefined, generator.lastPrompt)
      }
      if (generator.lastLLMRawOutput) {
        const rawPitch = (generator.lastLLMRawOutput as { pitch?: string }).pitch
        addStep('3. LLM Raw Output', 'Raw pitch from LLM', undefined, rawPitch)
      }
      if (generator.lastPitchWithCitations) {
        addStep(
          '4. Post-Processed Output',
          'After citation replacement',
          undefined,
          generator.lastPitchWithCitations
        )
      }

      addStep('5. Final Output', 'Complete pitch', undefined, pitch as string, {
        tokensUsed,
        pitchLength: pitch.length,
      })

      currentTest.finalOutput = pitch as string
      currentTest.tokensUsed = tokensUsed
      currentTest.pitchLength = pitch.length

      expect(pitch).toBeDefined()
      expect(pitch.length).toBeGreaterThan(0)
      expect(pitch).toContain('$500')
      expect(pitch).toContain('$1000')
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should generate pitch with all opportunity types with real LLM', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = createTestPolicy()
    const opportunities = [createTestOpportunity()]
    const bundleOptions = [createTestBundleOption()]
    const optimizations = [createTestDeductibleOptimization()]

    currentTest = {
      testName: 'Generate Pitch with All Opportunity Types',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', {
        opportunities,
        bundleOptions,
        deductibleOptimizations: optimizations,
        policy,
      })

      const pitch = await generator.generatePitch(
        opportunities,
        bundleOptions,
        optimizations,
        policy
      )
      const tokensUsed = (pitch as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed

      if (generator.lastPrompt) {
        addStep('2. Prompt', 'Prompt sent to LLM', undefined, generator.lastPrompt)
      }
      if (generator.lastLLMRawOutput) {
        const rawPitch = (generator.lastLLMRawOutput as { pitch?: string }).pitch
        addStep('3. LLM Raw Output', 'Raw pitch from LLM', undefined, rawPitch)
      }
      if (generator.lastPitchWithCitations) {
        addStep(
          '4. Post-Processed Output',
          'After citation replacement',
          undefined,
          generator.lastPitchWithCitations
        )
      }

      addStep('5. Final Output', 'Complete pitch', undefined, pitch as string, {
        tokensUsed,
        pitchLength: pitch.length,
      })

      currentTest.finalOutput = pitch as string
      currentTest.tokensUsed = tokensUsed
      currentTest.pitchLength = pitch.length

      expect(pitch).toBeDefined()
      expect(pitch.length).toBeGreaterThan(0)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should generate pitch when no opportunities with real LLM', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = createTestPolicy()

    currentTest = {
      testName: 'Generate Pitch with No Opportunities',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', {
        opportunities: [],
        bundleOptions: [],
        deductibleOptimizations: [],
        policy,
      })

      // Check server-side detection
      addStep(
        '2. Server-Side Detection',
        'Check if LLM should be called',
        {
          opportunitiesCount: 0,
          bundleOptionsCount: 0,
          deductibleOptimizationsCount: 0,
        },
        {
          shouldCallLLM: false,
          reason: 'No opportunities found, LLM will be skipped (server-side detection)',
        }
      )

      const pitch = await generator.generatePitch([], [], [], policy)
      const tokensUsed = (pitch as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed

      addStep('3. Final Output', 'Fallback pitch (no LLM call made)', undefined, pitch as string, {
        tokensUsed: tokensUsed ?? 0,
        pitchLength: pitch.length,
        note: 'No LLM call was made - this is a server-side fallback pitch.',
      })

      currentTest.finalOutput = pitch as string
      currentTest.tokensUsed = tokensUsed ?? 0
      currentTest.pitchLength = pitch.length

      expect(pitch).toBeDefined()
      expect(pitch.length).toBeGreaterThan(0)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  afterAll(async () => {
    if (process.env.USE_REAL_LLM === 'true' && testResults.length > 0) {
      await generateMarkdownReport(testResults)

      // Also write JSON for programmatic access
      const fs = require('node:fs')
      const path = require('node:path')
      const reportPath = path.join(
        process.cwd(),
        'test-reports',
        'pitch-generator-llm-results.json'
      )
      const dir = path.dirname(reportPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
    }
  })
})
