import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { intakeResultSchema } from '@repo/shared'
import type { IntakeResult } from '@repo/shared'
import { testMessages } from '../../__tests__/fixtures/test-messages'

/**
 * Live API Contract Tests
 *
 * Tests against actual running server with real HTTP requests.
 * Validates response schema, status codes, and data structure.
 *
 * These tests ensure the API contract matches the schema definition
 * and catch integration issues that unit tests might miss.
 */

const API_URL = process.env.TEST_API_URL || 'http://localhost:7070'
const TEST_TIMEOUT = 10000 // 10 seconds

// Check if server is available
async function isServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch {
    return false
  }
}

// Check server availability at module level (before tests are defined)
const serverAvailable = await isServerAvailable()

if (!serverAvailable) {
  console.warn(`⚠️  Server not available at ${API_URL}. Skipping contract tests.`)
  console.warn('   Start server with: bun run dev')
  console.warn('   Then run: TEST_API_URL=http://localhost:7070 bun run test:contract')
}

describe('POST /api/intake - Live API Contract Tests', () => {
  afterAll(() => {
    // Cleanup if needed
  })

  describe('Request Validation', () => {
    it.skipIf(!serverAvailable)(
      'should return 400 for invalid request body',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'data' }),
        })

        expect(response.status).toBe(400)
        const body = (await response.json()) as { error?: { code?: string } }
        expect(body.error).toBeDefined()
        expect(body.error?.code).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it.skipIf(!serverAvailable)(
      'should return 400 for missing message field',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationHistory: [] }),
        })

        expect(response.status).toBe(400)
      },
      TEST_TIMEOUT
    )

    it.skipIf(!serverAvailable)(
      'should return 400 for empty message',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '' }),
        })

        expect(response.status).toBe(400)
      },
      TEST_TIMEOUT
    )
  })

  describe('Key-Value Extraction', () => {
    it.skipIf(!serverAvailable)(
      'should extract fields from key-value syntax and validate response schema',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 's:CA a:30 l:auto v:2',
          }),
        })

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('application/json')

        const body: unknown = await response.json()

        // Validate response against IntakeResult schema
        const validationResult = intakeResultSchema.safeParse(body)
        expect(validationResult.success).toBe(true)

        if (!validationResult.success) {
          console.error('Schema validation errors:', validationResult.error.errors)
          throw new Error('Response does not match IntakeResult schema')
        }

        const result: IntakeResult = validationResult.data

        // Validate response structure
        expect(result.profile).toBeDefined()
        expect(result.profile.state).toBe('CA')
        expect(result.profile.age).toBe(30)
        expect(result.profile.productLine).toBe('auto')
        expect(result.profile.vehicles).toBe(2)
        expect(result.missingFields).toBeDefined()
        expect(Array.isArray(result.missingFields)).toBe(true)
        expect(result.complianceValidated).toBe(true)
        expect(result.trace).toBeDefined()
        expect(result.trace?.flow).toBe('conversational')
        expect(result.trace?.timestamp).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it.skipIf(!serverAvailable)(
      'should handle all field aliases correctly',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'k:2 d:3 c:1 h:4 o:true',
          }),
        })

        expect(response.status).toBe(200)
        const body: unknown = await response.json()
        const validationResult = intakeResultSchema.safeParse(body)

        expect(validationResult.success).toBe(true)
        if (validationResult.success) {
          const result = validationResult.data
          expect(result.profile.kids).toBe(2)
          expect(result.profile.householdSize).toBe(4) // 'd' maps to householdSize
          expect(result.profile.vehicles).toBe(1) // 'c' maps to vehicles
          expect(result.profile.ownsHome).toBe(true)
        }
      },
      TEST_TIMEOUT
    )
  })

  describe('Natural Language Extraction', () => {
    it.skipIf(!serverAvailable)(
      'should extract fields from natural language and validate response schema',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: testMessages.naturalLanguage.complete,
          }),
        })

        expect(response.status).toBe(200)
        const body: unknown = await response.json()

        // Validate response against schema
        const validationResult = intakeResultSchema.safeParse(body)
        expect(validationResult.success).toBe(true)

        if (validationResult.success) {
          const result = validationResult.data
          expect(result.profile).toBeDefined()
          expect(result.missingFields).toBeDefined()
          expect(Array.isArray(result.missingFields)).toBe(true)
          expect(result.complianceValidated).toBe(true)
          expect(result.trace).toBeDefined()
        }
      },
      TEST_TIMEOUT
    )

    it.skipIf(!serverAvailable)(
      'should handle conversation history',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'I am 35 years old',
            conversationHistory: ['I need auto insurance', 'What state are you in?', 'California'],
          }),
        })

        expect(response.status).toBe(200)
        const body: unknown = await response.json()
        const validationResult = intakeResultSchema.safeParse(body)

        expect(validationResult.success).toBe(true)
        if (validationResult.success) {
          const result = validationResult.data
          expect(result.profile).toBeDefined()
          expect(result.trace?.inputs).toBeDefined()
        }
      },
      TEST_TIMEOUT
    )
  })

  describe('Response Schema Validation', () => {
    it.skipIf(!serverAvailable)(
      'should always return valid IntakeResult schema',
      async () => {
        const testCases = [
          { message: testMessages.keyValue.simple },
          { message: testMessages.naturalLanguage.simple },
          { message: testMessages.keyValue.multiple },
          { message: testMessages.naturalLanguage.detailed },
        ]

        for (const testCase of testCases) {
          const response = await fetch(`${API_URL}/api/intake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase),
          })

          expect(response.status).toBe(200)
          const body: unknown = await response.json()
          const validationResult = intakeResultSchema.safeParse(body)

          if (!validationResult.success) {
            console.error(`Schema validation failed for: ${testCase.message}`)
            console.error('Errors:', validationResult.error.errors)
            console.error('Response:', JSON.stringify(body, null, 2))
          }

          expect(validationResult.success).toBe(true)
        }
      },
      TEST_TIMEOUT * 2
    ) // Longer timeout for multiple requests

    it.skipIf(!serverAvailable)(
      'should include all required IntakeResult fields',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 's:CA' }),
        })

        expect(response.status).toBe(200)
        const body: unknown = await response.json()
        const validationResult = intakeResultSchema.safeParse(body)

        expect(validationResult.success).toBe(true)
        if (validationResult.success) {
          const result = validationResult.data

          // Check all required fields exist
          expect(result.profile).toBeDefined()
          expect(result.missingFields).toBeDefined()
          expect(result.complianceValidated).toBeDefined()
          expect(typeof result.complianceValidated).toBe('boolean')

          // Optional fields - check that they're allowed (schema validation already passed)
          // Note: undefined values are omitted in JSON, so they may not exist in the object
          expect(result.trace).toBeDefined() // trace is always included
          // route, opportunities, prefill are optional and may be undefined/missing
          // pitch is always included (empty string for MVP)
          expect('pitch' in result).toBe(true)
          expect(typeof result.pitch).toBe('string')
        }
      },
      TEST_TIMEOUT
    )
  })

  describe('Error Handling', () => {
    it.skipIf(!serverAvailable)(
      'should return structured error response for invalid requests',
      async () => {
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'request' }),
        })

        expect(response.status).toBe(400)
        const body = (await response.json()) as {
          error?: { code?: string; message?: string }
        }

        // Validate error structure
        expect(body.error).toBeDefined()
        expect(body.error?.code).toBeDefined()
        expect(typeof body.error?.code).toBe('string')
        expect(body.error?.message).toBeDefined()
        expect(typeof body.error?.message).toBe('string')
      },
      TEST_TIMEOUT
    )
  })

  describe('Performance', () => {
    it.skipIf(!serverAvailable)(
      'should respond within reasonable time for key-value extraction',
      async () => {
        const startTime = Date.now()

        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 's:CA l:auto' }),
        })

        const duration = Date.now() - startTime

        expect(response.status).toBe(200)
        expect(duration).toBeLessThan(1000) // Key-value should be < 1 second
      },
      TEST_TIMEOUT
    )

    it.skipIf(!serverAvailable)(
      'should handle timeout gracefully for LLM calls',
      async () => {
        // This test verifies timeout handling (if LLM_TIMEOUT_MS is set low)
        // Note: Actual timeout behavior depends on LLM provider configuration
        const response = await fetch(`${API_URL}/api/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'I need insurance but this is a very long message that might trigger timeout',
          }),
        })

        // Should either succeed or return graceful error (not hang)
        expect([200, 500, 503]).toContain(response.status)
      },
      TEST_TIMEOUT * 2
    ) // Longer timeout for LLM call
  })
})
