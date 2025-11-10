/**
 * Knowledge Pack RAG Service Interface
 *
 * Provides read-only query interface for knowledge pack data.
 * All queries read from in-memory Maps (no filesystem access).
 */

import type { Carrier, State } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { getAllCarriers, getAllStates, getCarrier, getState } from './knowledge-pack-loader'

/**
 * Get a carrier by name
 *
 * @param name - Carrier name (e.g., "GEICO", "Progressive", "State Farm")
 * @returns Carrier object or undefined if not found
 */
export function getCarrierByName(name: string): Carrier | undefined {
  return getCarrier(name)
}

/**
 * Get a state by code
 *
 * @param code - Two-letter state code (e.g., "CA", "TX", "FL")
 * @returns State object or undefined if not found
 */
export function getStateByCode(code: string): State | undefined {
  return getState(code)
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
 * Get all states
 *
 * @returns Array of all loaded states
 */
export function getAllStatesList(): State[] {
  return getAllStates()
}

/**
 * Check if a carrier operates in a specific state
 *
 * @param carrierName - Carrier name
 * @param stateCode - Two-letter state code
 * @returns true if carrier operates in state, false otherwise
 */
export function carrierOperatesInState(carrierName: string, stateCode: string): boolean {
  const carrier = getCarrier(carrierName)
  if (!carrier) {
    return false
  }

  const operatesIn = getFieldValue(carrier.operatesIn, [])
  return operatesIn.includes(stateCode)
}

/**
 * Get all carriers that operate in a specific state
 *
 * @param stateCode - Two-letter state code
 * @returns Array of carrier names that operate in the state
 */
export function getCarriersForState(stateCode: string): string[] {
  const carriers = getAllCarriers()
  return carriers
    .filter((carrier) => {
      const operatesIn = getFieldValue(carrier.operatesIn, [])
      return operatesIn.includes(stateCode)
    })
    .map((carrier) => carrier.name)
}

/**
 * Get all products offered by a carrier
 *
 * @param carrierName - Carrier name
 * @returns Array of product names (e.g., ["auto", "home", "renters", "umbrella"])
 */
export function getCarrierProducts(carrierName: string): string[] {
  const carrier = getCarrier(carrierName)
  if (!carrier) {
    return []
  }

  return getFieldValue(carrier.products, [])
}
