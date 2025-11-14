import { beforeEach, describe, expect, it } from 'bun:test'
import { SuppressionManager } from '../suppression-manager'

describe('SuppressionManager', () => {
  let manager: SuppressionManager

  beforeEach(() => {
    manager = new SuppressionManager()
  })

  describe('addSuppression', () => {
    it('should add field to suppression list', () => {
      manager.addSuppression('ownsHome')

      expect(manager.isSuppressed('ownsHome')).toBe(true)
      expect(manager.getAll()).toEqual(['ownsHome'])
    })

    it('should prevent duplicate fields', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('ownsHome')
      manager.addSuppression('ownsHome')

      expect(manager.getAll()).toEqual(['ownsHome'])
      expect(manager.getAll().length).toBe(1)
    })

    it('should add multiple different fields', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')
      manager.addSuppression('cleanRecord3Yr')

      expect(manager.getAll()).toEqual(['ownsHome', 'age', 'cleanRecord3Yr'])
      expect(manager.getAll().length).toBe(3)
    })
  })

  describe('removeSuppression', () => {
    it('should remove field from suppression list', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')

      manager.removeSuppression('ownsHome')

      expect(manager.isSuppressed('ownsHome')).toBe(false)
      expect(manager.isSuppressed('age')).toBe(true)
      expect(manager.getAll()).toEqual(['age'])
    })

    it('should handle removing non-existent field gracefully', () => {
      manager.addSuppression('ownsHome')

      manager.removeSuppression('age') // Field not in list

      expect(manager.getAll()).toEqual(['ownsHome'])
    })

    it('should handle removing from empty list', () => {
      manager.removeSuppression('ownsHome')

      expect(manager.getAll()).toEqual([])
    })
  })

  describe('isSuppressed', () => {
    it('should return true for suppressed fields', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')

      expect(manager.isSuppressed('ownsHome')).toBe(true)
      expect(manager.isSuppressed('age')).toBe(true)
    })

    it('should return false for non-suppressed fields', () => {
      manager.addSuppression('ownsHome')

      expect(manager.isSuppressed('age')).toBe(false)
      expect(manager.isSuppressed('cleanRecord3Yr')).toBe(false)
    })

    it('should return false for empty list', () => {
      expect(manager.isSuppressed('ownsHome')).toBe(false)
    })

    it('should return false after field is removed', () => {
      manager.addSuppression('ownsHome')
      manager.removeSuppression('ownsHome')

      expect(manager.isSuppressed('ownsHome')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return empty array initially', () => {
      expect(manager.getAll()).toEqual([])
    })

    it('should return all suppressed fields', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')
      manager.addSuppression('cleanRecord3Yr')

      expect(manager.getAll()).toEqual(['ownsHome', 'age', 'cleanRecord3Yr'])
    })

    it('should return copy of array (not reference)', () => {
      manager.addSuppression('ownsHome')

      const fields1 = manager.getAll()
      const fields2 = manager.getAll()

      // Mutate the returned array
      fields1.push('age')

      // Original should not be affected
      expect(manager.getAll()).toEqual(['ownsHome'])
      expect(fields1).toEqual(['ownsHome', 'age'])
      expect(fields2).toEqual(['ownsHome'])
    })

    it('should not allow external mutation via returned array', () => {
      manager.addSuppression('ownsHome')

      const fields = manager.getAll()
      fields.push('age')
      fields.push('cleanRecord3Yr')

      // Manager's internal state should remain unchanged
      expect(manager.getAll()).toEqual(['ownsHome'])
      expect(manager.isSuppressed('age')).toBe(false)
      expect(manager.isSuppressed('cleanRecord3Yr')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should reset list to empty array', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')
      manager.addSuppression('cleanRecord3Yr')

      manager.clear()

      expect(manager.getAll()).toEqual([])
      expect(manager.isSuppressed('ownsHome')).toBe(false)
      expect(manager.isSuppressed('age')).toBe(false)
      expect(manager.isSuppressed('cleanRecord3Yr')).toBe(false)
    })

    it('should handle clearing empty list', () => {
      manager.clear()

      expect(manager.getAll()).toEqual([])
    })

    it('should allow adding fields after clear', () => {
      manager.addSuppression('ownsHome')
      manager.clear()
      manager.addSuppression('age')

      expect(manager.getAll()).toEqual(['age'])
      expect(manager.isSuppressed('ownsHome')).toBe(false)
      expect(manager.isSuppressed('age')).toBe(true)
    })
  })

  describe('complete workflow scenarios', () => {
    it('should handle suppress → unsuppress → suppress again', () => {
      // Suppress
      manager.addSuppression('ownsHome')
      expect(manager.isSuppressed('ownsHome')).toBe(true)

      // Unsuppress (convert to known)
      manager.removeSuppression('ownsHome')
      expect(manager.isSuppressed('ownsHome')).toBe(false)

      // Suppress again (user dismisses it again)
      manager.addSuppression('ownsHome')
      expect(manager.isSuppressed('ownsHome')).toBe(true)
    })

    it('should handle multiple operations in sequence', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')
      manager.removeSuppression('ownsHome')
      manager.addSuppression('cleanRecord3Yr')
      manager.addSuppression('age') // Duplicate, should be ignored

      expect(manager.getAll()).toEqual(['age', 'cleanRecord3Yr'])
      expect(manager.getAll().length).toBe(2)
    })

    it('should handle /reset command (clear)', () => {
      manager.addSuppression('ownsHome')
      manager.addSuppression('age')

      // Simulate /reset command
      manager.clear()

      expect(manager.getAll()).toEqual([])
    })
  })
})
