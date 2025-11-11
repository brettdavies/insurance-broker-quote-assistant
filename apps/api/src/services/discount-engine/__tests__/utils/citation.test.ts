/**
 * Citation Utilities Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Carrier, Discount } from '@repo/shared'
import { createCitation } from '../../utils/citation'

describe('createCitation', () => {
  const createTestDiscount = (id: string): Discount => ({
    _id: id,
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: 10, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: { description: 'Test' },
      _sources: [],
    },
  })

  const createTestCarrier = (name: string): Carrier => ({
    _id: `carr_${name.toLowerCase()}`,
    _sources: [],
    name,
    operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
    products: { _id: 'fld2', value: ['auto'], _sources: [] },
    eligibility: { _id: 'elig1', _sources: [] },
    discounts: [],
  })

  it('should create citation with discount ID', () => {
    const discount = createTestDiscount('disc_abc123')
    const carrier = createTestCarrier('GEICO')
    const citation = createCitation(discount, carrier)

    expect(citation.id).toBe('disc_abc123')
    expect(citation.type).toBe('discount')
    expect(citation.carrier).toBe('GEICO')
  })

  it('should create file path from carrier name', () => {
    const discount = createTestDiscount('disc_test')
    const carrier = createTestCarrier('State Farm')
    const citation = createCitation(discount, carrier)

    expect(citation.file).toBe('knowledge_pack/carriers/state-farm.json')
  })

  it('should handle carrier names with spaces', () => {
    const discount = createTestDiscount('disc_test')
    const carrier = createTestCarrier('State Farm Insurance')
    const citation = createCitation(discount, carrier)

    expect(citation.file).toBe('knowledge_pack/carriers/state-farm-insurance.json')
  })

  it('should handle lowercase carrier names', () => {
    const discount = createTestDiscount('disc_test')
    const carrier = createTestCarrier('geico')
    const citation = createCitation(discount, carrier)

    expect(citation.file).toBe('knowledge_pack/carriers/geico.json')
  })

  it('should include all required citation fields', () => {
    const discount = createTestDiscount('disc_xyz789')
    const carrier = createTestCarrier('Progressive')
    const citation = createCitation(discount, carrier)

    expect(citation).toHaveProperty('id')
    expect(citation).toHaveProperty('type')
    expect(citation).toHaveProperty('carrier')
    expect(citation).toHaveProperty('file')
    expect(citation.id).toBe('disc_xyz789')
    expect(citation.type).toBe('discount')
    expect(citation.carrier).toBe('Progressive')
  })
})

