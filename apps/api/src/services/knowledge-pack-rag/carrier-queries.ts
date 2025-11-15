/**
 * Carrier Queries
 *
 * Query functions for carrier-related data from the knowledge pack.
 */

import type { Carrier } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import { getAllCarriers } from '../knowledge-pack-loader'

/**
 * Get a carrier by name (case-insensitive)
 *
 * @param name - Carrier name (e.g., "GEICO", "geico", "Progressive", "progressive")
 * @returns Carrier object or undefined if not found
 */
export function getCarrierByName(name: string): Carrier | undefined {
  // Case-insensitive lookup: find carrier by comparing names
  const allCarriers = getAllCarriers()
  return allCarriers.find((carrier) => carrier.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get all carriers
 *
 * @returns Array of all loaded carriers
 */
export function getAllCarriersList(): Carrier[] {
  return getAllCarriers()
}

/**
 * Check if a carrier operates in a specific state (case-insensitive)
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns true if carrier operates in state, false otherwise
 */
export function carrierOperatesInState(carrierName: string, stateCode: string): boolean {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return false
  }

  const operatesIn = getFieldValue(carrier.operatesIn, [])
  // Normalize state code to uppercase for comparison
  return operatesIn.includes(stateCode.toUpperCase())
}

/**
 * Get all carriers that operate in a specific state (case-insensitive state code)
 *
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns Array of carrier names that operate in the state
 */
export function getCarriersForState(stateCode: string): string[] {
  const carriers = getAllCarriers()
  const normalizedStateCode = stateCode.toUpperCase()
  return carriers
    .filter((carrier) => {
      const operatesIn = getFieldValue(carrier.operatesIn, [])
      return operatesIn.includes(normalizedStateCode)
    })
    .map((carrier) => carrier.name)
}

/**
 * Get all products offered by a carrier (case-insensitive carrier name)
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @returns Array of product names (e.g., ["auto", "home", "renters", "umbrella"])
 */
export function getCarrierProducts(carrierName: string): string[] {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return []
  }

  return getFieldValue(carrier.products, [])
}

/**
 * Get products that a carrier offers in a specific state
 *
 * Returns products carrier offers, filtered by whether carrier operates in the state.
 * If carrier doesn't operate in state, returns empty array.
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns Array of product names available in the state, or empty array if carrier doesn't operate there
 */
export function getCarrierProductsForState(carrierName: string, stateCode: string): string[] {
  // Check if carrier operates in state first
  if (!carrierOperatesInState(carrierName, stateCode)) {
    return []
  }

  // Return all products carrier offers (carrier operates in state, so all products are available)
  return getCarrierProducts(carrierName)
}

/**
 * Check if a carrier operates in a specific state
 *
 * Wrapper around carrierOperatesInState for consistency with other helper functions.
 * Returns boolean indicating if carrier operates in state.
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns true if carrier operates in state, false otherwise
 */
export function getCarrierStateAvailability(carrierName: string, stateCode: string): boolean {
  return carrierOperatesInState(carrierName, stateCode)
}
