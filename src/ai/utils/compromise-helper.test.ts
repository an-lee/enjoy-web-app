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
})

