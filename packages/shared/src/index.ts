/**
 * Shared Package Index
 *
 * Main entry point for the shared package.
 * Re-exports all schemas, services, utils, and constants.
 */

// Re-export all schemas
export * from './index/schemas'

// Re-export all services
export * from './index/services'

// Re-export all utils
export * from './index/utils'

// Re-export all constants
export * from './index/constants'

// Export test utilities (for use in test files only)
// NOTE: DO NOT export test-utils from main package - they import bun:test which breaks browser builds
// Test files should import directly: import { ... } from '@repo/shared/src/test-utils'
// export * from './test-utils'  // DISABLED - breaks browser builds
