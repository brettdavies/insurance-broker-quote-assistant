#!/usr/bin/env bun

/**
 * Generate batch cuid2 IDs for knowledge pack Phase 2
 *
 * Usage:
 *   bun run scripts/generate-ids.ts <count> [prefix]
 *
 * Examples:
 *   bun run scripts/generate-ids.ts 10            # Generate 10 IDs
 *   bun run scripts/generate-ids.ts 10 "page_"    # Generate 10 page IDs
 *   bun run scripts/generate-ids.ts 50 "raw_"     # Generate 50 raw data IDs
 */

import { createId } from '@paralleldrive/cuid2';

const count = parseInt(process.argv[2] || '1', 10);
const prefix = process.argv[3] || '';

if (isNaN(count) || count < 1) {
  console.error('Error: Count must be a positive integer');
  console.error('Usage: bun run scripts/generate-ids.ts <count> [prefix]');
  process.exit(1);
}

for (let i = 0; i < count; i++) {
  console.log(`${prefix}${createId()}`);
}
