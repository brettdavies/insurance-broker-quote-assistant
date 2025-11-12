/**
 * Unit Tests for Policy Upload Route
 *
 * Tests file validation, error handling, and PolicySummary extraction.
 * Uses mocked ConversationalExtractor to avoid real LLM calls.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-10
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PolicySummary, UserProfile } from '@repo/shared'
import { Hono } from 'hono'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import type { LLMProvider } from '../../services/llm-provider'
import { createPolicyRoute } from '../policy'

// Mock LLM provider that supports file extraction
const createMockLLMProvider = (): LLMProvider => {
  return {
    extractWithStructuredOutput: async () => ({
      profile: {
        state: 'CA',
        productType: 'auto',
      },
      confidence: {
        state: 0.9,
        productType: 0.8,
      },
      reasoning: 'Mock LLM extraction',
    }),
    extractFromFile: async () => ({
      profile: {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        coverageLimits: {
          liability: 50000,
        },
        deductibles: {
          auto: 500,
        },
        premiums: {
          annual: 1200,
        },
        effectiveDates: {
          effectiveDate: '2025-01-01',
          expirationDate: '2026-01-01',
        },
      } as unknown as Partial<UserProfile>,
      confidence: {
        carrier: 0.9,
        state: 0.95,
        productType: 0.85,
        coverageLimits: 0.8,
        deductibles: 0.85,
        premiums: 0.9,
        effectiveDates: 0.95,
      },
      reasoning: 'Mock file extraction',
      tokensUsed: 1500,
      extractionTime: 2500,
    }),
  }
}

describe('POST /api/policy/upload', () => {
  let app: Hono
  let extractor: ConversationalExtractor

  beforeEach(() => {
    const mockLLMProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(mockLLMProvider)
    const policyRoute = createPolicyRoute(extractor, mockLLMProvider)
    app = new Hono()
    app.route('/', policyRoute)
  })

  it('should return 400 for missing file', async () => {
    const formData = new FormData()
    // Don't add any file

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('INVALID_REQUEST')
    expect(body.error?.message).toBe('No file provided')
  })

  it('should return 400 for invalid file type', async () => {
    const formData = new FormData()
    const invalidFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
    formData.append('file', invalidFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('INVALID_FILE')
    expect(body.error?.message).toContain('Invalid file type')
  })

  it('should return 400 for file exceeding size limit', async () => {
    const formData = new FormData()
    // Create a file larger than 5MB (5MB = 5 * 1024 * 1024 bytes)
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('')
    const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
    formData.append('file', largeFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('INVALID_FILE')
    expect(body.error?.message).toContain('File size exceeds')
  })

  it('should accept valid PDF file', async () => {
    const formData = new FormData()
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: 'application/pdf' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      extractedText?: string
      fileName?: string
      policySummary?: PolicySummary
    }
    expect(body.extractedText).toBeDefined()
    expect(body.fileName).toBe('policy.pdf')
    expect(body.policySummary).toBeDefined()
    expect(body.policySummary?.carrier).toBe('GEICO')
    expect(body.policySummary?.state).toBe('CA')
  })

  it('should accept valid DOCX file', async () => {
    const formData = new FormData()
    const docxFile = new File(['DOCX content'], 'policy.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    formData.append('file', docxFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      extractedText?: string
      fileName?: string
      policySummary?: PolicySummary
    }
    expect(body.extractedText).toBeDefined()
    expect(body.fileName).toBe('policy.docx')
  })

  it('should accept valid TXT file', async () => {
    const formData = new FormData()
    const txtFile = new File(['TXT content'], 'policy.txt', { type: 'text/plain' })
    formData.append('file', txtFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      extractedText?: string
      fileName?: string
      policySummary?: PolicySummary
    }
    expect(body.extractedText).toBeDefined()
    expect(body.fileName).toBe('policy.txt')
  })

  it('should return extracted text in key-value format', async () => {
    const formData = new FormData()
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: 'application/pdf' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { extractedText?: string }
    expect(body.extractedText).toBeDefined()
    expect(body.extractedText).toContain('carrier:GEICO')
    expect(body.extractedText).toContain('state:CA')
    expect(body.extractedText).toContain('productType:auto')
    // Should end with trailing space to trigger pill transformation
    expect(body.extractedText?.endsWith(' ')).toBe(true)
  })

  it('should return PolicySummary with confidence scores', async () => {
    const formData = new FormData()
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: 'application/pdf' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { policySummary?: PolicySummary }
    expect(body.policySummary).toBeDefined()
    expect(body.policySummary?.confidence).toBeDefined()
    expect(body.policySummary?.confidence?.carrier).toBe(0.9)
    expect(body.policySummary?.confidence?.state).toBe(0.95)
  })

  it('should return 500 for extraction failure', async () => {
    // Create a mock provider that throws an error
    const errorProvider: LLMProvider = {
      extractWithStructuredOutput: async () => ({
        profile: {},
        confidence: {},
        reasoning: 'Mock error',
      }),
      extractFromFile: async () => {
        throw new Error('Extraction failed')
      },
    }

    const errorExtractor = new ConversationalExtractor(errorProvider)
    const errorRoute = createPolicyRoute(errorExtractor, errorProvider)
    const errorApp = new Hono()
    errorApp.route('/', errorRoute)

    const formData = new FormData()
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: 'application/pdf' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await errorApp.request(req)
    expect(res.status).toBe(500)

    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('EXTRACTION_ERROR')
  })

  it('should return 500 for empty extraction result', async () => {
    // Create a mock provider that returns empty result
    const emptyProvider: LLMProvider = {
      extractWithStructuredOutput: async () => ({
        profile: {},
        confidence: {},
        reasoning: 'Empty extraction',
      }),
      extractFromFile: async () => ({
        profile: {} as Partial<UserProfile>,
        confidence: {},
        reasoning: 'No data extracted',
        tokensUsed: 0,
        extractionTime: 0,
      }),
    }

    const emptyExtractor = new ConversationalExtractor(emptyProvider)
    const emptyRoute = createPolicyRoute(emptyExtractor, emptyProvider)
    const emptyApp = new Hono()
    emptyApp.route('/', emptyRoute)

    const formData = new FormData()
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: 'application/pdf' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await emptyApp.request(req)
    expect(res.status).toBe(500)

    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('EXTRACTION_ERROR')
  })

  it('should handle file without MIME type by checking extension', async () => {
    const formData = new FormData()
    // File without explicit MIME type
    const pdfFile = new File(['PDF content'], 'policy.pdf', { type: '' })
    formData.append('file', pdfFile)

    const req = new Request('http://localhost/api/policy/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    // Should still accept based on file extension
    expect(res.status).toBe(200)
  })
})
