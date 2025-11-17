/**
 * Routing Utilities (Frontend)
 *
 * Fetches routing decisions dynamically from the backend API based on profile.
 * All routing comes from the routing engine - no hardcoded values.
 */

import type { RouteDecision, UserProfile } from '@repo/shared'
import { logError } from './logger'

/**
 * Get route decision from backend API based on profile
 *
 * @param state - State code (e.g., 'CA', 'TX')
 * @param productType - Product type (e.g., 'auto', 'home')
 * @param profile - Full user profile for routing evaluation
 * @returns Promise that resolves to RouteDecision or null
 */
export async function getRouteDecision(
  state: string,
  productType: string,
  profile: UserProfile
): Promise<RouteDecision | null> {
  try {
    // Log what profile is being sent
    console.log('[Frontend] getRouteDecision: Sending profile to API', {
      state,
      productType,
      profileAge: profile?.age,
      profileKeys: Object.keys(profile),
      profile: JSON.stringify(profile).substring(0, 200),
    })

    // Call backend API - proxy in server.ts will forward to backend (port 7070)
    const response = await fetch('/api/routing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch routing: ${response.status} ${response.statusText}`)
    }

    // Check if response is JSON (not HTML)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
    }

    const data = (await response.json()) as { route: RouteDecision }
    return data.route || null
  } catch (error) {
    void logError('Failed to fetch routing from API', error as Error)
    // Return null on error (UI will show placeholder)
    return null
  }
}
