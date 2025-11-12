#!/usr/bin/env bun

/**
 * Print the JSON Schema that gets sent to Gemini API
 * This shows exactly what schema structure Gemini receives for structured outputs
 *
 * Run: bun run apps/api/src/scripts/print-schema.ts
 */

import { userProfileSchema } from '@repo/shared'
import { zodToJsonSchema } from 'zod-to-json-schema'

async function main() {
  console.log('='.repeat(80))
  console.log('JSON Schema sent to Gemini API (after conversion and fixes)')
  console.log('='.repeat(80))
  console.log()

  // Convert Zod schema to JSON Schema (same as GeminiProvider does)
  let jsonSchema = zodToJsonSchema(userProfileSchema, {
    target: 'openApi3',
    $refStrategy: 'none',
  })

  // Use the actual transformer (same as GeminiProvider does)
  const { transformSchemaForGemini } = await import('../services/gemini/schema-transformer')
  jsonSchema = transformSchemaForGemini(jsonSchema as Record<string, unknown>)

  // Print the final schema
  console.log(JSON.stringify(jsonSchema, null, 2))
  console.log()
  console.log('='.repeat(80))
}

if (import.meta.main) {
  main().catch(console.error)
}
