/**
 * Shared Test Fixtures for Knowledge Pack
 *
 * Provides reusable test data creation functions to eliminate duplication
 * across test files.
 */

/**
 * Create a test carrier data structure
 *
 * @param name - Carrier name (e.g., "GEICO", "Progressive")
 * @param operatesIn - Array of state codes where carrier operates
 * @param products - Array of product names (e.g., ["auto", "home"])
 * @param discounts - Optional array of discount objects
 * @returns CarrierFile structure for testing
 */
export function createTestCarrier(
  name: string,
  operatesIn: string[],
  products: string[],
  discounts: unknown[] = []
): {
  meta: {
    schemaVersion: string
    generatedDate: string
    carrier: string
  }
  carrier: {
    _id: string
    _sources: unknown[]
    name: string
    operatesIn: {
      _id: string
      value: string[]
      _sources: unknown[]
    }
    products: {
      _id: string
      value: string[]
      _sources: unknown[]
    }
    eligibility: {
      _id: string
      _sources: unknown[]
    }
    discounts: unknown[]
  }
} {
  const now = new Date().toISOString()
  const carrierId = `carr_${name.toLowerCase().replace(/\s+/g, '-')}`

  return {
    meta: {
      schemaVersion: '1.0',
      generatedDate: now,
      carrier: name,
    },
    carrier: {
      _id: carrierId,
      _sources: [],
      name,
      operatesIn: {
        _id: 'fld_test1',
        value: operatesIn,
        _sources: [],
      },
      products: {
        _id: 'fld_test2',
        value: products,
        _sources: [],
      },
      eligibility: {
        _id: 'elig_test1',
        _sources: [],
      },
      discounts:
        discounts.length > 0
          ? discounts
          : [
              {
                _id: 'disc_test1',
                name: { _id: 'fld_test3', value: 'Test Discount', _sources: [] },
                percentage: { _id: 'fld_test4', value: 10, _sources: [] },
                products: { _id: 'fld_test5', value: ['auto'], _sources: [] },
                states: { _id: 'fld_test6', value: ['CA'], _sources: [] },
                requirements: { _id: 'fld_test7', value: {}, _sources: [] },
              },
            ],
    },
  }
}

/**
 * Create a test state data structure
 *
 * @param code - Two-letter state code (e.g., "CA", "TX")
 * @param name - State name (e.g., "California", "Texas")
 * @param minimumCoverages - Optional minimum coverage structure
 * @returns StateFile structure for testing
 */
export function createTestState(
  code: string,
  name: string,
  minimumCoverages?: {
    _id: string
    auto?: {
      _id: string
      bodilyInjuryPerPerson?: { _id: string; value: number; _sources: unknown[] }
      bodilyInjuryPerAccident?: { _id: string; value: number; _sources: unknown[] }
      propertyDamage?: { _id: string; value: number; _sources: unknown[] }
      [key: string]: unknown
    }
    home?: { _id: string; [key: string]: unknown }
    renters?: { _id: string; [key: string]: unknown }
  }
): {
  meta: {
    schemaVersion: string
    generatedDate: string
    state: string
  }
  state: {
    _id: string
    _sources: unknown[]
    code: string
    name: string
    minimumCoverages: {
      _id: string
      auto: {
        _id: string
        bodilyInjuryPerPerson?: { _id: string; value: number; _sources: unknown[] }
        bodilyInjuryPerAccident?: { _id: string; value: number; _sources: unknown[] }
        propertyDamage?: { _id: string; value: number; _sources: unknown[] }
        [key: string]: unknown
      }
      home: { _id: string; [key: string]: unknown }
      renters: { _id: string; [key: string]: unknown }
    }
  }
} {
  const now = new Date().toISOString()
  const stateId = `state_${code.toLowerCase()}`

  return {
    meta: {
      schemaVersion: '1.0',
      generatedDate: now,
      state: code,
    },
    state: {
      _id: stateId,
      _sources: [],
      code,
      name,
      minimumCoverages: minimumCoverages
        ? {
            _id: minimumCoverages._id,
            auto: minimumCoverages.auto || {
              _id: 'fld_test2',
              bodilyInjuryPerPerson: {
                _id: 'fld_test3',
                value: 25000,
                _sources: [],
              },
              bodilyInjuryPerAccident: {
                _id: 'fld_test4',
                value: 50000,
                _sources: [],
              },
              propertyDamage: {
                _id: 'fld_test5',
                value: 10000,
                _sources: [],
              },
            },
            home: minimumCoverages.home || { _id: 'fld_test6' },
            renters: minimumCoverages.renters || { _id: 'fld_test7' },
          }
        : {
            _id: 'fld_test1',
            auto: {
              _id: 'fld_test2',
              bodilyInjuryPerPerson: {
                _id: 'fld_test3',
                value: 25000,
                _sources: [],
              },
              bodilyInjuryPerAccident: {
                _id: 'fld_test4',
                value: 50000,
                _sources: [],
              },
              propertyDamage: {
                _id: 'fld_test5',
                value: 10000,
                _sources: [],
              },
            },
            home: {
              _id: 'fld_test6',
            },
            renters: {
              _id: 'fld_test7',
            },
          },
    },
  }
}
