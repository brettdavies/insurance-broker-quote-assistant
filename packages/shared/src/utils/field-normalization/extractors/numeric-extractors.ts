/**
 * Numeric Field Extractors
 *
 * Extracts numeric field values from broker notes text.
 * Handles patterns for drivers, vehicles, kids, household size, and age.
 */

import type { NormalizedField } from '../types'

/**
 * Extract number of drivers from broker notes
 * Looks for patterns like "2 drivers", "3 drivers", etc.
 */
export function extractDrivers(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "X drivers" or "X driver"
  const driversMatch = lowerText.match(/(\d+)\s+drivers?/)
  if (driversMatch) {
    const num = Number.parseInt(driversMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = driversMatch.index ?? 0
      return {
        fieldName: 'drivers',
        value: num,
        originalText: driversMatch[0],
        startIndex,
        endIndex: startIndex + driversMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract number of vehicles from broker notes
 * Looks for patterns like "2 cars", "3 vehicles", "1 car", etc.
 */
export function extractVehicles(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "X cars" or "X car"
  const carsMatch = lowerText.match(/(\d+)\s+cars?/)
  if (carsMatch) {
    const num = Number.parseInt(carsMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = carsMatch.index ?? 0
      return {
        fieldName: 'vehicles',
        value: num,
        originalText: carsMatch[0],
        startIndex,
        endIndex: startIndex + carsMatch[0].length,
      }
    }
  }

  // Pattern: "X vehicles" or "X vehicle"
  const vehiclesMatch = lowerText.match(/(\d+)\s+vehicles?/)
  if (vehiclesMatch) {
    const num = Number.parseInt(vehiclesMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = vehiclesMatch.index ?? 0
      return {
        fieldName: 'vehicles',
        value: num,
        originalText: vehiclesMatch[0],
        startIndex,
        endIndex: startIndex + vehiclesMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract number of kids from broker notes
 * Looks for patterns like "2 kids", "3 children", etc.
 */
export function extractKids(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "X kids" or "X kid"
  const kidsMatch = lowerText.match(/(\d+)\s+kids?/)
  if (kidsMatch) {
    const num = Number.parseInt(kidsMatch[1] || '', 10)
    if (!Number.isNaN(num) && num >= 0) {
      const startIndex = kidsMatch.index ?? 0
      return {
        fieldName: 'kids',
        value: num,
        originalText: kidsMatch[0],
        startIndex,
        endIndex: startIndex + kidsMatch[0].length,
      }
    }
  }

  // Pattern: "X children" or "X child"
  const childrenMatch = lowerText.match(/(\d+)\s+children?/)
  if (childrenMatch) {
    const num = Number.parseInt(childrenMatch[1] || '', 10)
    if (!Number.isNaN(num) && num >= 0) {
      const startIndex = childrenMatch.index ?? 0
      return {
        fieldName: 'kids',
        value: num,
        originalText: childrenMatch[0],
        startIndex,
        endIndex: startIndex + childrenMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract household size from broker notes
 * Only extracts from EXPLICIT mentions like "family of 4", "lives alone", "2 people"
 * Does NOT extract from "2 drivers" or "2 kids" - those are extracted separately
 */
export function extractHouseholdSize(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "lives alone" or "lives by self" → 1
  const aloneMatch = lowerText.match(/\b(lives\s+alone|lives\s+by\s+self|single|solo)\b/)
  if (aloneMatch) {
    const startIndex = aloneMatch.index ?? 0
    return {
      fieldName: 'householdSize',
      value: 1,
      originalText: aloneMatch[0],
      startIndex,
      endIndex: startIndex + aloneMatch[0].length,
    }
  }

  // Pattern: "family of X" or "household of X" → X
  const familyMatch = lowerText.match(/\b(family|household)\s+of\s+(\d+)\b/)
  if (familyMatch) {
    const num = Number.parseInt(familyMatch[2] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = familyMatch.index ?? 0
      return {
        fieldName: 'householdSize',
        value: num,
        originalText: familyMatch[0],
        startIndex,
        endIndex: startIndex + familyMatch[0].length,
      }
    }
  }

  // Pattern: "X people" or "X person household" (explicit household size mention)
  const peopleMatch = lowerText.match(/(\d+)\s+(people|person|ppl)\b/)
  if (peopleMatch) {
    const num = Number.parseInt(peopleMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = peopleMatch.index ?? 0
      return {
        fieldName: 'householdSize',
        value: num,
        originalText: peopleMatch[0],
        startIndex,
        endIndex: startIndex + peopleMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract age from broker notes
 * Looks for patterns like "35yo", "35 years old", "age 35", etc.
 */
export function extractAge(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "35yo" or "35 yo" or "35y/o"
  const yoMatch = lowerText.match(/(\d+)\s*y\s*o\b/i)
  if (yoMatch?.[1]) {
    const num = Number.parseInt(yoMatch[1], 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = yoMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: yoMatch[0],
        startIndex,
        endIndex: startIndex + yoMatch[0].length,
      }
    }
  }

  // Pattern: "age 35" or "age: 35"
  const ageMatch = lowerText.match(/\bage\s*:?\s*(\d+)\b/i)
  if (ageMatch?.[1]) {
    const num = Number.parseInt(ageMatch[1], 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = ageMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: ageMatch[0],
        startIndex,
        endIndex: startIndex + ageMatch[0].length,
      }
    }
  }

  // Pattern: "35 years old" or "35 yrs old"
  const yearsOldMatch = lowerText.match(/(\d+)\s*(?:years?|yrs?)\s+old\b/i)
  if (yearsOldMatch) {
    const num = Number.parseInt(yearsOldMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = yearsOldMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: yearsOldMatch[0],
        startIndex,
        endIndex: startIndex + yearsOldMatch[0].length,
      }
    }
  }

  return null
}
