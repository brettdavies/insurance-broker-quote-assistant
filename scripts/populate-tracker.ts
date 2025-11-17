#!/usr/bin/env bun

/**
 * Populate search-tracker.json with all queries from sot-search-queries.md
 * Parses the markdown file and creates search entries for each query
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SEARCH_QUERIES_PATH = 'docs/knowledge-pack/sot-search-queries.md'
const TRACKER_PATH = 'knowledge_pack/search-tracker.json'

// Fixed sets of values for placeholder expansion
const STATES = [
  { abbrev: 'CA', full: 'California' },
  { abbrev: 'TX', full: 'Texas' },
  { abbrev: 'FL', full: 'Florida' },
  { abbrev: 'NY', full: 'New York' },
  { abbrev: 'IL', full: 'Illinois' },
]

const CARRIERS = ['GEICO', 'Progressive', 'State Farm']

const PRODUCTS = ['auto', 'home', 'renters', 'umbrella']

/**
 * Expand placeholders in query templates
 * Supports: [state], [carrier], [product]
 */
function expandPlaceholders(template: string): string[] {
  const expanded: string[] = []

  // Detect which placeholders are present
  const hasState = template.includes('[state]') || template.includes('[State]')
  const hasCarrier = template.includes('[Carrier]') || template.includes('[carrier]')
  const hasProduct = template.includes('[Product]') || template.includes('[product]')

  if (hasState && hasCarrier) {
    // Expand both state and carrier
    for (const state of STATES) {
      for (const carrier of CARRIERS) {
        let query = template
        query = query.replace(/\[state\]/g, state.full)
        query = query.replace(/\[State\]/g, state.full)
        query = query.replace(/\[Carrier\]/g, carrier)
        query = query.replace(/\[carrier\]/g, carrier)
        expanded.push(query)
      }
    }
  } else if (hasState && hasProduct) {
    // Expand both state and product
    for (const state of STATES) {
      for (const product of PRODUCTS) {
        let query = template
        query = query.replace(/\[state\]/g, state.full)
        query = query.replace(/\[State\]/g, state.full)
        query = query.replace(/\[Product\]/g, product)
        query = query.replace(/\[product\]/g, product)
        expanded.push(query)
      }
    }
  } else if (hasCarrier && hasProduct) {
    // Expand both carrier and product
    for (const carrier of CARRIERS) {
      for (const product of PRODUCTS) {
        let query = template
        query = query.replace(/\[Carrier\]/g, carrier)
        query = query.replace(/\[carrier\]/g, carrier)
        query = query.replace(/\[Product\]/g, product)
        query = query.replace(/\[product\]/g, product)
        expanded.push(query)
      }
    }
  } else if (hasState) {
    // Expand state only
    for (const state of STATES) {
      let query = template
      query = query.replace(/\[state\]/g, state.full)
      query = query.replace(/\[State\]/g, state.full)
      expanded.push(query)
    }
  } else if (hasCarrier) {
    // Expand carrier only
    for (const carrier of CARRIERS) {
      let query = template
      query = query.replace(/\[Carrier\]/g, carrier)
      query = query.replace(/\[carrier\]/g, carrier)
      expanded.push(query)
    }
  } else if (hasProduct) {
    // Expand product only
    for (const product of PRODUCTS) {
      let query = template
      query = query.replace(/\[Product\]/g, product)
      query = query.replace(/\[product\]/g, product)
      expanded.push(query)
    }
  } else {
    // No recognized placeholders, return as-is
    expanded.push(template)
  }

  return expanded
}

interface SearchEntry {
  id: string
  query: string
  category: string
  carrier?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending'
  assignedTo: null
  startedAt: null
  completedAt: null
  durationSeconds: null
  rawDataFiles: []
  pageFiles: []
  commitHash: null
  errorMessage: null
  retryCount: 0
  notes: null
}

interface Category {
  name: string
  description: string
  searches: SearchEntry[]
}

interface Tracker {
  meta: {
    version: string
    createdDate: string
    lastUpdated: string
    totalSearches: number
    description: string
  }
  statusCounts: {
    pending: number
    in_progress: number
    completed: number
    failed: number
  }
  categories: Category[]
}

// Read and parse the search queries document
const content = readFileSync(SEARCH_QUERIES_PATH, 'utf-8')

// Extract all queries from code blocks
const queries: Array<{
  query: string
  section: string
  subsection: string
}> = []

let currentSection = ''
let currentSubsection = ''

const lines = content.split('\n')
let inCodeBlock = false
let codeBlockContent: string[] = []

for (const line of lines) {
  // Track sections
  if (line.startsWith('## ')) {
    currentSection = line.replace('## ', '').trim()
    currentSubsection = ''
    continue
  }

  if (line.startsWith('### ')) {
    currentSubsection = line.replace('### ', '').trim()
    continue
  }

  // Track code blocks
  if (line.trim() === '```') {
    if (inCodeBlock) {
      // End of code block - process queries
      for (const query of codeBlockContent) {
        let trimmed = query.trim()
        // Skip comments, empty lines, site: operators, and other non-query content
        if (
          trimmed &&
          !trimmed.startsWith('#') &&
          !trimmed.startsWith('site:') &&
          !trimmed.startsWith('intitle:') &&
          !trimmed.startsWith('filetype:') &&
          !trimmed.includes('Example:') &&
          trimmed.length > 5
        ) {
          // Skip curly brace placeholders (used in examples/documentation)
          if (trimmed.includes('{') && trimmed.includes('}')) {
            continue
          }

          // Clean up the query - remove leading quote if malformed
          if (trimmed.endsWith('"') && !trimmed.startsWith('"') && trimmed.includes('" "')) {
            // Likely a malformed query like: GEICO" "available in" states
            // Convert to: "GEICO" "available in" states
            trimmed = `"${trimmed}`
          }

          // Expand placeholders if present
          if (trimmed.includes('[') && trimmed.includes(']')) {
            const expanded = expandPlaceholders(trimmed)
            for (const expandedQuery of expanded) {
              queries.push({
                query: expandedQuery,
                section: currentSection,
                subsection: currentSubsection,
              })
            }
          } else {
            // No placeholders, add as-is
            queries.push({
              query: trimmed,
              section: currentSection,
              subsection: currentSubsection,
            })
          }
        }
      }
      codeBlockContent = []
    }
    inCodeBlock = !inCodeBlock
    continue
  }

  if (inCodeBlock) {
    codeBlockContent.push(line)
  }
}

console.log(`Found ${queries.length} queries`)

// Generate search IDs
const searchIds = execSync(`bun run scripts/generate-ids.ts ${queries.length} "search_"`)
  .toString()
  .trim()
  .split('\n')

console.log(`Generated ${searchIds.length} search IDs`)

// Map sections to categories and carriers
const categoryMap: Record<string, { name: string; description: string }> = {
  '1. Carrier Operating States & Availability': {
    name: 'carrier-states',
    description: 'Carrier state availability and operating regions',
  },
  '2. Auto Insurance Discounts': {
    name: 'carrier-discounts-auto',
    description: 'Auto insurance discount information by carrier',
  },
  '3. Home Insurance Discounts': {
    name: 'carrier-discounts-home',
    description: 'Home insurance discount information by carrier',
  },
  '4. Auto Eligibility Requirements': {
    name: 'carrier-eligibility-auto',
    description: 'Auto insurance eligibility requirements',
  },
  '5. Home Eligibility Requirements': {
    name: 'carrier-eligibility-home',
    description: 'Home insurance eligibility requirements',
  },
  '6. State Minimum Requirements': {
    name: 'state-minimums',
    description: 'State-mandated minimum insurance requirements',
  },
  '7. Average Pricing Data': {
    name: 'pricing-averages',
    description: 'Average insurance pricing by state and carrier',
  },
  '8. Broker Commission & Compensation': {
    name: 'broker-commission',
    description: 'Broker commission rates and compensation',
  },
  '9. Product-Specific Coverage': {
    name: 'product-coverage',
    description: 'Coverage details for specific products',
  },
  '10. State-Specific Requirements': {
    name: 'state-specific',
    description: 'State-specific insurance requirements and regulations',
  },
  '11. Compliance & Prohibited Statements': {
    name: 'compliance',
    description: 'Regulatory compliance and prohibited statements',
  },
  '12. Discount Stacking & Combinations': {
    name: 'discount-stacking',
    description: 'Discount combination and stacking rules',
  },
  '13. Industry Benchmarking Sources': {
    name: 'industry-benchmarking',
    description: 'Industry data sources and benchmarking',
  },
}

// Extract carrier from query
function extractCarrier(query: string): string | undefined {
  const carriers = ['GEICO', 'Progressive', 'State Farm']
  for (const carrier of carriers) {
    if (query.includes(carrier)) {
      return carrier
    }
  }
  return undefined
}

// Determine priority based on section and carrier
function determinePriority(section: string, hasCarrier: boolean): 'high' | 'medium' | 'low' {
  if (
    section.includes('Carrier Operating States') ||
    section.includes('Auto Insurance Discounts')
  ) {
    return 'high'
  }
  if (section.includes('State Minimum') || section.includes('Home Insurance Discounts')) {
    return 'high'
  }
  if (hasCarrier) {
    return 'medium'
  }
  return 'low'
}

// Create categories and searches
const categoriesMap = new Map<string, Category>()

queries.forEach((q, index) => {
  const categoryInfo = categoryMap[q.section] || {
    name: q.section.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: q.section,
  }

  if (!categoriesMap.has(categoryInfo.name)) {
    categoriesMap.set(categoryInfo.name, {
      name: categoryInfo.name,
      description: categoryInfo.description,
      searches: [],
    })
  }

  const carrier = extractCarrier(q.query)
  const priority = determinePriority(q.section, !!carrier)

  const search: SearchEntry = {
    id: searchIds[index],
    query: q.query,
    category: categoryInfo.name,
    ...(carrier && { carrier }),
    priority,
    status: 'pending',
    assignedTo: null,
    startedAt: null,
    completedAt: null,
    durationSeconds: null,
    rawDataFiles: [],
    pageFiles: [],
    commitHash: null,
    errorMessage: null,
    retryCount: 0,
    notes: null,
  }

  const category = categoriesMap.get(categoryInfo.name)
  if (category) {
    category.searches.push(search)
  }
})

// Create tracker structure
const tracker: Tracker = {
  meta: {
    version: '1.0',
    createdDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalSearches: queries.length,
    description: 'Phase 2 Knowledge Pack Data Gathering - All Search Queries',
  },
  statusCounts: {
    pending: queries.length,
    in_progress: 0,
    completed: 0,
    failed: 0,
  },
  categories: Array.from(categoriesMap.values()),
}

// Write tracker
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2))

console.log('\n✅ Successfully created search tracker:')
console.log(`   Total searches: ${tracker.meta.totalSearches}`)
console.log(`   Categories: ${tracker.categories.length}`)
console.log(`   Pending: ${tracker.statusCounts.pending}`)
console.log(`   File: ${TRACKER_PATH}`)
