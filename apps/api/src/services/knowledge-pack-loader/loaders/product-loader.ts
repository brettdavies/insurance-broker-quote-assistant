/**
 * Product Loader
 *
 * Handles loading product files from the knowledge pack.
 */

import type { Product, ProductFile } from '@repo/shared'
import { readFile } from 'node:fs/promises'
import { logWarn } from '../../../utils/logger'

/**
 * Load a single product file
 */
export async function loadProductFile(
  filePath: string,
  productsMap: Map<string, Product>,
  loadingStatus: {
    errors: Array<{ file: string; error: string }>
  }
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data: ProductFile = JSON.parse(content)

    // Validate required fields
    if (!data.product || !data.product.code) {
      throw new Error('Invalid product file: missing product.code')
    }

    // Store in map keyed by product code
    productsMap.set(data.product.code, data.product)
  } catch (error) {
    const fileName = filePath.split('/').pop() || filePath
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: fileName, error: errorMessage })
    await logWarn('Failed to load product file', { file: fileName, error: errorMessage })
  }
}
