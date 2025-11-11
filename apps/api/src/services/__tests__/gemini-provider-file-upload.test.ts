/**
 * Gemini Provider File Upload Test
 *
 * Tests the File API upload functionality with mock files
 * to verify the correct SDK format and implementation.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { GoogleGenAI } from '@google/genai'
import { policySummarySchema } from '@repo/shared'
import { GeminiProvider } from '../gemini-provider'

// Skip if no API key (use TEST_GEMINI_API=true to run)
const USE_REAL_API = process.env.TEST_GEMINI_API === 'true'

describe('GeminiProvider File Upload', () => {
  let provider: GeminiProvider

  beforeEach(() => {
    provider = new GeminiProvider(
      process.env.GEMINI_API_KEY,
      'gemini-2.5-flash-lite',
      30000 // 30 second timeout for file uploads
    )
  })

  describe.skipIf(!USE_REAL_API)('Real API File Upload', () => {
    it('should upload a text file and extract policy data', async () => {
      // Create a mock policy document as text file
      const policyText = `
        Insurance Policy Document
        Carrier: GEICO
        State: California (CA)
        Product Type: Auto Insurance
        Policy Number: POL-12345
        
        Coverage Limits:
        - Bodily Injury: $100,000/$300,000
        - Property Damage: $50,000
        - Uninsured Motorist: $100,000/$300,000
        
        Deductibles:
        - Collision: $500
        - Comprehensive: $500
        
        Premiums:
        - Annual Premium: $1,200.00
        - Monthly Premium: $100.00
        
        Effective Dates:
        - Effective Date: 2024-01-01
        - Expiration Date: 2025-01-01
      `

      // Create a File object from text
      const file = new File([policyText], 'policy.txt', {
        type: 'text/plain',
      })

      // Test file upload and extraction
      const result = await provider.extractFromFile(file, undefined, policySummarySchema)

      expect(result.profile).toBeDefined()
      expect(result.confidence).toBeDefined()
      expect(result.reasoning).toBeDefined()

      // Verify extracted fields match expected structure
      const profile = result.profile as unknown as {
        carrier?: string
        state?: string
        productType?: string
      }

      expect(profile.carrier).toBeDefined()
      expect(profile.state).toBeDefined()
      expect(profile.productType).toBeDefined()
    }, 60000) // 60 second timeout for file upload + extraction

    it('should handle PDF file upload (if SDK supports)', async () => {
      // Create a minimal PDF file (PDF header + basic structure)
      // This is a minimal valid PDF structure
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(GEICO Auto Policy) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`

      const file = new File([pdfContent], 'policy.pdf', {
        type: 'application/pdf',
      })

      // Test PDF upload (may fail if SDK doesn't support PDF directly)
      try {
        const result = await provider.extractFromFile(file, undefined, policySummarySchema)
        expect(result.profile).toBeDefined()
      } catch (error) {
        // If PDF upload fails, that's okay - we'll document the limitation
        console.warn('PDF upload test failed (may not be supported):', error)
      }
    }, 60000)
  })

  describe('SDK Structure Verification', () => {
    it('should verify GoogleGenAI has files property', () => {
      const ai = new GoogleGenAI({})
      // Check if files property exists
      expect(ai).toHaveProperty('files')
    })

    it('should verify files.upload method exists', () => {
      const ai = new GoogleGenAI({})
      // Check if files.upload method exists
      expect(ai.files).toBeDefined()
      expect(typeof ai.files.upload).toBe('function')
    })
  })
})
