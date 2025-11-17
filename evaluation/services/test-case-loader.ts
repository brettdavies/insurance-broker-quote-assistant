/**
 * Test Case Loader
 *
 * Loads test cases from the test-cases directory.
 */

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { TestCase } from '../types'

const TEST_CASES_DIR = join(import.meta.dir, '../test-cases')

/**
 * Load all test cases from test-cases directory
 */
export async function loadTestCases(): Promise<TestCase[]> {
  const testCases: TestCase[] = []

  // Load conversational test cases
  const conversationalCases = await loadTestCasesFromDirectory(
    join(TEST_CASES_DIR, 'conversational'),
    'conversational'
  )
  testCases.push(...conversationalCases)

  // Load policy test cases
  const policyCases = await loadTestCasesFromDirectory(join(TEST_CASES_DIR, 'policy'), 'policy')
  testCases.push(...policyCases)

  return testCases.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Load test cases from a specific directory
 */
async function loadTestCasesFromDirectory(
  directory: string,
  type: 'conversational' | 'policy'
): Promise<TestCase[]> {
  try {
    const files = await readdir(directory)
    const testCases: TestCase[] = []

    for (const file of files.filter((f) => f.endsWith('.json'))) {
      const content = await readFile(join(directory, file), 'utf-8')
      testCases.push({ ...JSON.parse(content), type })
    }

    return testCases
  } catch (error) {
    console.warn(`⚠️  Could not load ${type} test cases from ${directory}: ${error}`)
    return []
  }
}
