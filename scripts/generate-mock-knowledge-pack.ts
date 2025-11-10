#!/usr/bin/env bun

/**
 * Generate mock knowledge pack files for development/testing
 *
 * Usage:
 *   bun run scripts/generate-mock-knowledge-pack.ts
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createId } from '@paralleldrive/cuid2'

const generateId = (prefix: string) => `${prefix}_${createId()}`

const now = new Date().toISOString()

// Helper to create field with metadata
const createField = <T>(value: T, sources: unknown[] = []) => ({
  _id: generateId('fld'),
  value,
  _sources: sources,
})

// Helper to create source
const createSource = (uri: string, elementRef?: string, extractedValue?: string) => ({
  uri,
  accessedDate: now,
  elementRef,
  extractedValue,
  confidence: 'high' as const,
  primary: true,
})

// Generate carrier files
const carriers = [
  {
    name: 'GEICO',
    operatesIn: ['CA', 'TX', 'FL', 'NY', 'IL', 'AZ', 'CO', 'GA', 'NC', 'VA'],
    products: ['auto', 'home', 'renters', 'umbrella'],
    discounts: [
      { name: 'Multi-Policy Bundle', percentage: 15, products: ['auto', 'home'], stackable: true },
      { name: 'Safe Driver', percentage: 10, products: ['auto'], stackable: true },
      { name: 'Good Student', percentage: 5, products: ['auto'], stackable: true },
      { name: 'Military', percentage: 15, products: ['auto', 'home', 'renters'], stackable: true },
      { name: 'Defensive Driving Course', percentage: 5, products: ['auto'], stackable: true },
    ],
    compensation: { commissionRate: 8, commissionType: 'percentage' },
  },
  {
    name: 'Progressive',
    operatesIn: ['CA', 'TX', 'FL', 'NY', 'IL', 'OH', 'PA', 'MI', 'IN', 'WI'],
    products: ['auto', 'home', 'renters', 'umbrella'],
    discounts: [
      { name: 'Multi-Policy Bundle', percentage: 12, products: ['auto', 'home'], stackable: true },
      { name: 'Safe Driver', percentage: 8, products: ['auto'], stackable: true },
      { name: 'Snapshot', percentage: 20, products: ['auto'], stackable: false },
      { name: 'Home Quote Discount', percentage: 5, products: ['home'], stackable: true },
      { name: 'Continuous Insurance', percentage: 5, products: ['auto'], stackable: true },
    ],
    compensation: { commissionRate: 7.5, commissionType: 'percentage' },
  },
  {
    name: 'State Farm',
    operatesIn: ['CA', 'TX', 'FL', 'NY', 'IL', 'AZ', 'CO', 'GA', 'NC', 'VA', 'OH', 'PA'],
    products: ['auto', 'home', 'renters', 'umbrella'],
    discounts: [
      { name: 'Multi-Policy Bundle', percentage: 17, products: ['auto', 'home'], stackable: true },
      { name: 'Safe Driver', percentage: 12, products: ['auto'], stackable: true },
      { name: 'Steer Clear', percentage: 5, products: ['auto'], stackable: true },
      { name: 'Drive Safe & Save', percentage: 30, products: ['auto'], stackable: false },
      { name: 'Home Security', percentage: 10, products: ['home'], stackable: true },
    ],
    compensation: { commissionRate: 9, commissionType: 'percentage' },
  },
]

for (const carrierData of carriers) {
  const carrierId = generateId('carr')
  const eligibilityId = generateId('elig')

  const carrier = {
    meta: {
      schemaVersion: '1.0',
      generatedDate: now,
      carrier: carrierData.name,
      totalDataPoints: 50 + Math.floor(Math.random() * 50),
      totalSources: 20 + Math.floor(Math.random() * 20),
      conflictsResolved: Math.floor(Math.random() * 5),
    },
    carrier: {
      _id: carrierId,
      _sources: [
        createSource(`https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/`),
      ],
      name: carrierData.name,
      operatesIn: createField(carrierData.operatesIn, [
        createSource(
          `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/states/`,
          'section#state-list'
        ),
      ]),
      products: createField(carrierData.products, [
        createSource(
          `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/products/`,
          'nav.products'
        ),
      ]),
      eligibility: {
        _id: eligibilityId,
        _sources: [],
        auto: {
          _id: generateId('elig'),
          minAge: createField(16, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/auto/eligibility/`
            ),
          ]),
          maxAge: createField(85, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/auto/eligibility/`
            ),
          ]),
          maxVehicles: createField(4, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/auto/eligibility/`
            ),
          ]),
        },
        home: {
          _id: generateId('elig'),
          minAge: createField(18, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/home/eligibility/`
            ),
          ]),
        },
        renters: {
          _id: generateId('elig'),
          minAge: createField(18, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/renters/eligibility/`
            ),
          ]),
        },
        umbrella: {
          _id: generateId('elig'),
          minAge: createField(21, [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/umbrella/eligibility/`
            ),
          ]),
        },
      },
      discounts: carrierData.discounts.map((disc) => ({
        _id: generateId('disc'),
        name: createField(disc.name, [
          createSource(
            `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/discounts/`,
            `div#${disc.name.toLowerCase().replace(/\s+/g, '-')}`
          ),
        ]),
        percentage: createField(disc.percentage, [
          createSource(
            `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/discounts/`,
            `div#${disc.name.toLowerCase().replace(/\s+/g, '-')} > p.percentage`,
            `${disc.percentage}%`
          ),
        ]),
        products: createField(disc.products, [
          createSource(
            `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/discounts/`,
            `div#${disc.name.toLowerCase().replace(/\s+/g, '-')} > p.applies-to`
          ),
        ]),
        states: createField(carrierData.operatesIn, []),
        requirements: createField(
          {
            mustHaveProducts: disc.products,
            minProducts: disc.products.length > 1 ? 2 : 1,
          },
          [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/discounts/`,
              `div#${disc.name.toLowerCase().replace(/\s+/g, '-')} > ul.requirements`
            ),
          ]
        ),
        stackable: createField(disc.stackable, []),
        description: createField(
          `${disc.name} discount available for ${disc.products.join(' and ')} insurance`,
          [
            createSource(
              `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/discounts/`
            ),
          ]
        ),
      })),
      compensation: {
        _id: generateId('comp'),
        commissionRate: createField(carrierData.compensation.commissionRate, [
          createSource(
            `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/broker/`
          ),
        ]),
        commissionType: createField(carrierData.compensation.commissionType, [
          createSource(
            `https://www.${carrierData.name.toLowerCase().replace(' ', '')}.com/broker/`
          ),
        ]),
      },
    },
  }

  const filename = `${carrierData.name.toLowerCase().replace(' ', '-')}.json`
  writeFileSync(
    join(process.cwd(), 'knowledge_pack', 'carriers', filename),
    JSON.stringify(carrier, null, 2)
  )
  console.log(`✅ Generated ${filename}`)
}

// Generate state files
const states = [
  {
    code: 'CA',
    name: 'California',
    auto: {
      bodilyInjuryPerPerson: 15000,
      bodilyInjuryPerAccident: 30000,
      propertyDamage: 5000,
      uninsuredMotorist: null,
      personalInjuryProtection: null,
    },
    home: {
      dwellingCoverage: null,
      liabilityCoverage: null,
    },
    renters: {
      personalProperty: null,
      liabilityCoverage: null,
    },
  },
  {
    code: 'TX',
    name: 'Texas',
    auto: {
      bodilyInjuryPerPerson: 30000,
      bodilyInjuryPerAccident: 60000,
      propertyDamage: 25000,
      uninsuredMotorist: 30000,
      personalInjuryProtection: null,
    },
    home: {
      dwellingCoverage: null,
      liabilityCoverage: null,
    },
    renters: {
      personalProperty: null,
      liabilityCoverage: null,
    },
  },
  {
    code: 'FL',
    name: 'Florida',
    auto: {
      bodilyInjuryPerPerson: 10000,
      bodilyInjuryPerAccident: 20000,
      propertyDamage: 10000,
      uninsuredMotorist: null,
      personalInjuryProtection: 10000,
    },
    home: {
      dwellingCoverage: null,
      liabilityCoverage: null,
    },
    renters: {
      personalProperty: null,
      liabilityCoverage: null,
    },
  },
  {
    code: 'NY',
    name: 'New York',
    auto: {
      bodilyInjuryPerPerson: 25000,
      bodilyInjuryPerAccident: 50000,
      propertyDamage: 10000,
      uninsuredMotorist: 25000,
      personalInjuryProtection: 50000,
    },
    home: {
      dwellingCoverage: null,
      liabilityCoverage: null,
    },
    renters: {
      personalProperty: null,
      liabilityCoverage: null,
    },
  },
  {
    code: 'IL',
    name: 'Illinois',
    auto: {
      bodilyInjuryPerPerson: 25000,
      bodilyInjuryPerAccident: 50000,
      propertyDamage: 20000,
      uninsuredMotorist: 25000,
      personalInjuryProtection: null,
    },
    home: {
      dwellingCoverage: null,
      liabilityCoverage: null,
    },
    renters: {
      personalProperty: null,
      liabilityCoverage: null,
    },
  },
]

for (const stateData of states) {
  const stateId = generateId('state')
  const minimumCoveragesId = generateId('fld')

  const state = {
    meta: {
      schemaVersion: '1.0',
      generatedDate: now,
      state: stateData.code,
    },
    state: {
      _id: stateId,
      _sources: [
        createSource(`https://www.insurance.${stateData.code.toLowerCase()}.gov/`, 'main'),
      ],
      code: stateData.code,
      name: stateData.name,
      minimumCoverages: {
        _id: minimumCoveragesId,
        auto: {
          _id: generateId('fld'),
          ...(stateData.auto.bodilyInjuryPerPerson && {
            bodilyInjuryPerPerson: createField(stateData.auto.bodilyInjuryPerPerson, [
              createSource(
                `https://www.insurance.${stateData.code.toLowerCase()}.gov/auto/minimums/`,
                'table > tr:nth-child(1) > td:nth-child(2)',
                `$${stateData.auto.bodilyInjuryPerPerson.toLocaleString()}`
              ),
            ]),
          }),
          ...(stateData.auto.bodilyInjuryPerAccident && {
            bodilyInjuryPerAccident: createField(stateData.auto.bodilyInjuryPerAccident, [
              createSource(
                `https://www.insurance.${stateData.code.toLowerCase()}.gov/auto/minimums/`,
                'table > tr:nth-child(2) > td:nth-child(2)',
                `$${stateData.auto.bodilyInjuryPerAccident.toLocaleString()}`
              ),
            ]),
          }),
          ...(stateData.auto.propertyDamage && {
            propertyDamage: createField(stateData.auto.propertyDamage, [
              createSource(
                `https://www.insurance.${stateData.code.toLowerCase()}.gov/auto/minimums/`,
                'table > tr:nth-child(3) > td:nth-child(2)',
                `$${stateData.auto.propertyDamage.toLocaleString()}`
              ),
            ]),
          }),
          ...(stateData.auto.uninsuredMotorist && {
            uninsuredMotorist: createField(stateData.auto.uninsuredMotorist, [
              createSource(
                `https://www.insurance.${stateData.code.toLowerCase()}.gov/auto/minimums/`,
                'table > tr:nth-child(4) > td:nth-child(2)',
                `$${stateData.auto.uninsuredMotorist.toLocaleString()}`
              ),
            ]),
          }),
          ...(stateData.auto.personalInjuryProtection && {
            personalInjuryProtection: createField(stateData.auto.personalInjuryProtection, [
              createSource(
                `https://www.insurance.${stateData.code.toLowerCase()}.gov/auto/minimums/`,
                'table > tr:nth-child(5) > td:nth-child(2)',
                `$${stateData.auto.personalInjuryProtection.toLocaleString()}`
              ),
            ]),
          }),
        },
        home: {
          _id: generateId('fld'),
        },
        renters: {
          _id: generateId('fld'),
        },
      },
      specialRequirements: createField(
        {
          requiresProposition103Notice: stateData.code === 'CA',
          goodDriverDiscount: {
            available: true,
            criteria: 'No at-fault accidents in 3 years',
          },
        },
        [createSource(`https://www.insurance.${stateData.code.toLowerCase()}.gov/requirements/`)]
      ),
    },
  }

  const filename = `${stateData.code}.json`
  writeFileSync(
    join(process.cwd(), 'knowledge_pack', 'states', filename),
    JSON.stringify(state, null, 2)
  )
  console.log(`✅ Generated ${filename}`)
}

console.log('\n✅ Mock knowledge pack files generated successfully!')
