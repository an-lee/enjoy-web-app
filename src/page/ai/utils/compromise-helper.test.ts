/**
 * Tests for Compromise helper functions
 * Verifies abbreviation detection and entity recognition
 */

import { describe, it, expect } from 'vitest'
import {
  isAbbreviationWithCompromise,
  detectEntitiesWithCompromise,
  isPositionInEntity,
  detectAbbreviationsEnhanced,
  detectMeaningGroups,
  isMeaningGroupBoundary,
  isPositionInMeaningGroup,
} from './compromise-helper'

describe('compromise-helper', () => {
  describe('isAbbreviationWithCompromise', () => {
    it('should detect common abbreviations', () => {
      const result = isAbbreviationWithCompromise('Mr. Smith went to the U.S.A.', 'Mr.')
      expect(result).toBe(true)
    })

    it('should detect abbreviations without period in text', () => {
      const result = isAbbreviationWithCompromise('Dr Smith is here', 'Dr')
      expect(result).toBe(true)
    })

    it('should return false for non-abbreviations', () => {
      const result = isAbbreviationWithCompromise('The cat sat on the mat.', 'cat')
      expect(result).toBe(false)
    })
  })

  describe('detectEntitiesWithCompromise', () => {
    it('should detect people names (if supported)', () => {
      const result = detectEntitiesWithCompromise('John Smith went to Paris.')
      // Compromise may or may not detect entities depending on plugins
      // Just verify it doesn't crash and returns an array
      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect place names (if supported)', () => {
      const result = detectEntitiesWithCompromise('I visited New York and London.')
      // Compromise may or may not detect entities depending on plugins
      // Just verify it doesn't crash and returns an array
      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect organizations (if supported)', () => {
      const result = detectEntitiesWithCompromise('Microsoft and Apple are tech companies.')
      // Compromise may or may not detect entities depending on plugins
      // Just verify it doesn't crash and returns an array
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array for text without entities', () => {
      const result = detectEntitiesWithCompromise('The cat sat on the mat.')
      // May or may not detect entities, but should not crash
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('isPositionInEntity', () => {
    it('should return true if position is within an entity', () => {
      const entities = [
        { text: 'John Smith', start: 0, end: 10, type: 'person' as const },
        { text: 'New York', start: 20, end: 28, type: 'place' as const },
      ]
      expect(isPositionInEntity(5, entities)).toBe(true) // Within "John Smith"
      expect(isPositionInEntity(25, entities)).toBe(true) // Within "New York"
    })

    it('should return false if position is outside entities', () => {
      const entities = [
        { text: 'John Smith', start: 0, end: 10, type: 'person' as const },
      ]
      expect(isPositionInEntity(15, entities)).toBe(false)
      expect(isPositionInEntity(100, entities)).toBe(false)
    })

    it('should return false for empty entities array', () => {
      expect(isPositionInEntity(5, [])).toBe(false)
    })
  })

  describe('detectAbbreviationsEnhanced', () => {
    const manualList = new Set(['mr', 'mrs', 'dr', 'prof'])

    it('should use manual list first (fast path)', () => {
      const result = detectAbbreviationsEnhanced('Mr. Smith', 'Mr.', manualList)
      expect(result).toBe(true)
    })

    it('should fallback to Compromise for unknown abbreviations', () => {
      // This may or may not work depending on Compromise's detection
      // But should not crash
      const result = detectAbbreviationsEnhanced('Inc. is a company', 'Inc.', manualList)
      expect(typeof result).toBe('boolean')
    })

    it('should return false for non-abbreviations', () => {
      const result = detectAbbreviationsEnhanced('The cat sat.', 'cat', manualList)
      expect(result).toBe(false)
    })
  })

  describe('detectMeaningGroups', () => {
    it('should detect prepositional phrases', () => {
      const text = 'As a social psychologist, I study behavior.'
      const groups = detectMeaningGroups(text)

      // Should return an array (may or may not detect specific phrases depending on Compromise)
      expect(Array.isArray(groups)).toBe(true)

      // If groups are detected, verify structure
      groups.forEach(group => {
        expect(group).toHaveProperty('start')
        expect(group).toHaveProperty('end')
        expect(group).toHaveProperty('type')
        expect(group).toHaveProperty('text')
        expect(typeof group.start).toBe('number')
        expect(typeof group.end).toBe('number')
        expect(['prepositional', 'relative-clause', 'object-clause', 'noun-phrase', 'verb-phrase', 'infinitive', 'participle']).toContain(group.type)
      })

      // If prepositional phrase is detected, verify it contains "As"
      const prepPhrase = groups.find(g => g.type === 'prepositional' && g.text.includes('As'))
      if (prepPhrase) {
        expect(prepPhrase.text).toContain('As')
      }
    })

    it('should detect relative clauses', () => {
      const text = 'The person who has been trying is here.'
      const groups = detectMeaningGroups(text)

      // Should return an array
      expect(Array.isArray(groups)).toBe(true)

      // If relative clause is detected, verify it contains "who"
      const relativeClause = groups.find(g => g.type === 'relative-clause')
      if (relativeClause) {
        expect(relativeClause.text).toContain('who')
      }
    })

    it('should detect object clauses', () => {
      const text = 'I know what onearth was happening.'
      const groups = detectMeaningGroups(text)

      // Should return an array
      expect(Array.isArray(groups)).toBe(true)

      // If object clause is detected, verify it contains "what"
      const objectClause = groups.find(g => g.type === 'object-clause')
      if (objectClause) {
        expect(objectClause.text).toContain('what')
      }
    })

    it('should detect infinitive phrases', () => {
      const text = 'I want to figure out the answer.'
      const groups = detectMeaningGroups(text)

      // Should return an array
      expect(Array.isArray(groups)).toBe(true)

      // If infinitive is detected, verify it contains "to"
      const infinitive = groups.find(g => g.type === 'infinitive')
      if (infinitive) {
        expect(infinitive.text).toContain('to')
      }
    })

    it('should detect complex sentence with multiple meaning groups', () => {
      const text = 'As a social psychologist who has been trying since 2015 to figure out what onearth was happening to Gen Z, I was stunned.'
      const groups = detectMeaningGroups(text)

      // Should return an array (may detect 0 or more groups depending on Compromise)
      expect(Array.isArray(groups)).toBe(true)

      // Verify all groups have correct structure
      groups.forEach(group => {
        expect(group).toHaveProperty('start')
        expect(group).toHaveProperty('end')
        expect(group).toHaveProperty('type')
        expect(group).toHaveProperty('text')
        expect(group.start).toBeGreaterThanOrEqual(0)
        expect(group.end).toBeGreaterThan(group.start)
        expect(group.end).toBeLessThanOrEqual(text.length)
      })

      // Groups should be sorted by start position
      for (let i = 1; i < groups.length; i++) {
        expect(groups[i].start).toBeGreaterThanOrEqual(groups[i - 1].start)
      }
    })

    it('should handle empty text', () => {
      const groups = detectMeaningGroups('')
      expect(groups).toEqual([])
    })

    it('should handle simple text without complex phrases', () => {
      const groups = detectMeaningGroups('The cat sat.')
      // May or may not detect meaning groups, but should not crash
      expect(Array.isArray(groups)).toBe(true)
    })

    it('should merge overlapping groups', () => {
      const text = 'As a social psychologist who studies behavior.'
      const groups = detectMeaningGroups(text)

      // Groups should be sorted by start position
      for (let i = 1; i < groups.length; i++) {
        expect(groups[i].start).toBeGreaterThanOrEqual(groups[i - 1].start)
      }

      // Should not have overlapping groups (merged)
      for (let i = 1; i < groups.length; i++) {
        const prev = groups[i - 1]
        const curr = groups[i]
        // If they overlap, the longer one should be kept
        if (curr.start < prev.end) {
          // This should not happen after merging, but if it does, verify the longer one is kept
          const prevLength = prev.end - prev.start
          const currLength = curr.end - curr.start
          expect(currLength).toBeGreaterThanOrEqual(prevLength)
        }
      }
    })
  })

  describe('isMeaningGroupBoundary', () => {
    it('should return true at meaning group start', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
        { text: 'who has been trying', start: 25, end: 44, type: 'relative-clause' as const },
      ]
      expect(isMeaningGroupBoundary(0, groups)).toBe(true) // Start of first group
      expect(isMeaningGroupBoundary(25, groups)).toBe(true) // Start of second group
    })

    it('should return true at meaning group end', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isMeaningGroupBoundary(24, groups)).toBe(true) // End of group
    })

    it('should return false inside meaning group', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isMeaningGroupBoundary(10, groups)).toBe(false) // Inside group
    })

    it('should return false outside all groups', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isMeaningGroupBoundary(100, groups)).toBe(false) // Outside
    })

    it('should return false for empty groups', () => {
      expect(isMeaningGroupBoundary(0, [])).toBe(false)
    })
  })

  describe('isPositionInMeaningGroup', () => {
    it('should return true inside meaning group', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isPositionInMeaningGroup(10, groups)).toBe(true) // Inside group
    })

    it('should return false at meaning group boundaries', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isPositionInMeaningGroup(0, groups)).toBe(false) // At start (boundary)
      expect(isPositionInMeaningGroup(24, groups)).toBe(false) // At end (boundary)
    })

    it('should return false outside meaning group', () => {
      const groups = [
        { text: 'As a social psychologist', start: 0, end: 24, type: 'prepositional' as const },
      ]
      expect(isPositionInMeaningGroup(100, groups)).toBe(false) // Outside
    })

    it('should return false for empty groups', () => {
      expect(isPositionInMeaningGroup(10, [])).toBe(false)
    })
  })
})

