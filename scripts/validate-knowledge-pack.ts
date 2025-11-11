#!/usr/bin/env bun

/**
 * Validates all knowledge pack JSON files against their respective schemas.
 * 
 * Usage: bun run scripts/validate-knowledge-pack.ts
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const knowledgePackDir = join(rootDir, 'knowledge_pack')

interface ValidationResult {
  file: string
  valid: boolean
  errors: string[]
}

async function loadSchema(schemaPath: string): Promise<object> {
  const content = await readFile(schemaPath, 'utf-8')
  return JSON.parse(content)
}

async function validateFiles(): Promise<void> {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)

  // Load all schemas
  const carrierSchema = await loadSchema(join(knowledgePackDir, 'schemas', 'carrier.json'))
  const stateSchema = await loadSchema(join(knowledgePackDir, 'schemas', 'state.json'))
  const productSchema = await loadSchema(join(knowledgePackDir, 'schemas', 'product.json'))

  const validateCarrier = ajv.compile(carrierSchema)
  const validateState = ajv.compile(stateSchema)
  const validateProduct = ajv.compile(productSchema)

  const results: ValidationResult[] = []

  // Validate carrier files
  const carrierFiles = await readdir(join(knowledgePackDir, 'carriers'))
  for (const file of carrierFiles.filter(f => f.endsWith('.json'))) {
    const filePath = join(knowledgePackDir, 'carriers', file)
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    const valid = validateCarrier(data)
    results.push({
      file: `carriers/${file}`,
      valid: valid || false,
      errors: validateCarrier.errors?.map(e => `${e.instancePath} ${e.message}`) || []
    })
  }

  // Validate state files
  const stateFiles = await readdir(join(knowledgePackDir, 'states'))
  for (const file of stateFiles.filter(f => f.endsWith('.json'))) {
    const filePath = join(knowledgePackDir, 'states', file)
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    const valid = validateState(data)
    results.push({
      file: `states/${file}`,
      valid: valid || false,
      errors: validateState.errors?.map(e => `${e.instancePath} ${e.message}`) || []
    })
  }

  // Validate product files
  const productFiles = await readdir(join(knowledgePackDir, 'products'))
  for (const file of productFiles.filter(f => f.endsWith('.json'))) {
    const filePath = join(knowledgePackDir, 'products', file)
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    const valid = validateProduct(data)
    results.push({
      file: `products/${file}`,
      valid: valid || false,
      errors: validateProduct.errors?.map(e => `${e.instancePath} ${e.message}`) || []
    })
  }

  // Report results
  const validCount = results.filter(r => r.valid).length
  const invalidCount = results.filter(r => !r.valid).length

  console.log('\n📋 Knowledge Pack Validation Results\n')
  console.log(`✅ Valid: ${validCount}`)
  console.log(`❌ Invalid: ${invalidCount}`)
  console.log(`📊 Total: ${results.length}\n`)

  if (invalidCount > 0) {
    console.log('❌ Validation Errors:\n')
    for (const result of results.filter(r => !r.valid)) {
      console.log(`  ${result.file}:`)
      for (const error of result.errors) {
        console.log(`    - ${error}`)
      }
      console.log()
    }
    process.exit(1)
  } else {
    console.log('✅ All files passed validation!\n')
    process.exit(0)
  }
}

validateFiles().catch((error) => {
  console.error('❌ Validation script error:', error)
  process.exit(1)
})

