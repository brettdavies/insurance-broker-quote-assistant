/**
 * Carrier Loader
 *
 * Handles loading carrier files from the knowledge pack.
 */

import type { Carrier, CarrierFile } from '@repo/shared'
import { readFile } from 'node:fs/promises'
import { getFieldValue } from '../../../utils/field-helpers'
import { logWarn } from '../../../utils/logger'

/**
 * Load a single carrier file
 */
export async function loadCarrierFile(
  filePath: string,
  carriersMap: Map<string, Carrier>,
  loadingStatus: {
    carriersCount: number
    productsCount: number
    discountsCount: number
    errors: Array<{ file: string; error: string }>
  }
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data: CarrierFile = JSON.parse(content)

    // Validate required fields
    if (!data.carrier || !data.carrier.name) {
      throw new Error('Invalid carrier file: missing carrier.name')
    }

    // Store in map keyed by carrier name
    carriersMap.set(data.carrier.name, data.carrier)

    // Count products and discounts
    const products = getFieldValue(data.carrier.products, [])
    const discounts = data.carrier.discounts || []

    loadingStatus.carriersCount++
    loadingStatus.productsCount += products.length
    loadingStatus.discountsCount += discounts.length
  } catch (error) {
    const fileName = filePath.split('/').pop() || filePath
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: fileName, error: errorMessage })
    await logWarn('Failed to load carrier file', { file: fileName, error: errorMessage })
  }
}
