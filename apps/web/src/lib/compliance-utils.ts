/**
 * Compliance Utilities (Frontend)
 *
 * Fetches disclaimers dynamically from the backend API based on state and product.
 * All disclaimers come from the knowledge pack - no hardcoded values.
 */

import { logError } from './logger'

/**
 * Get disclaimers from backend API based on state and product
 *
 * @param state - State code (e.g., 'CA', 'TX')
 * @param productType - Product type (e.g., 'auto', 'home')
 * @returns Promise that resolves to array of disclaimers
 */
export async function getDisclaimers(state?: string, productType?: string): Promise<string[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams()
    if (state) {
      // Normalize state to uppercase (backend expects uppercase)
      params.append('state', state.toUpperCase())
    }
    if (productType) {
      params.append('productType', productType)
    }

    const url = `/api/disclaimers?${params.toString()}`

    // Call backend API - proxy in server.ts will forward to backend (port 7070)
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch disclaimers: ${response.status} ${response.statusText}`)
    }

    // Check if response is JSON (not HTML)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
    }

    const data = (await response.json()) as { disclaimers: string[] }
    return data.disclaimers || []
  } catch (error) {
    void logError('Failed to fetch disclaimers from API', error as Error)
    // Return empty array on error (UI will show placeholder)
    return []
  }
}
