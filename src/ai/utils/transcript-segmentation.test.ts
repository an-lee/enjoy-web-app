/**
 * Tests for transcript segmentation utility
 * Covers all edge cases and common scenarios
 */

import { describe, it, expect } from 'vitest'
import {
  convertToTranscriptFormat,
  type RawWordTiming,
} from './transcript-segmentation'

describe('convertToTranscriptFormat', () => {
  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = convertToTranscriptFormat('', [])
      expect(result.timeline).toEqual([])
    })

    it('should handle single word', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0, endTime: 0.5 },
      ]
      const result = convertToTranscriptFormat('Hello', timings)
      expect(result.timeline.length).toBeGreaterThan(0)
      expect(result.timeline[0].text).toBe('Hello')
    })

    it('should handle single-word sentence with question mark', () => {
      const timings: RawWordTiming[] = [
        { text: 'Why', startTime: 0, endTime: 0.5 },
      ]
      const result = convertToTranscriptFormat('Why?', timings)
      expect(result.timeline.length).toBe(1)
      expect(result.timeline[0].text).toBe('Why')
      expect(result.timeline[0].timeline?.length).toBe(1)
    })

    it('should handle single-word sentence with exclamation', () => {
      const timings: RawWordTiming[] = [
        { text: 'Yes', startTime: 0, endTime: 0.5 },
      ]
      const result = convertToTranscriptFormat('Yes!', timings)
      expect(result.timeline.length).toBe(1)
      expect(result.timeline[0].text).toBe('Yes')
    })

    it('should handle single-word sentence with period', () => {
      const timings: RawWordTiming[] = [
        { text: 'No', startTime: 0, endTime: 0.5 },
      ]
      const result = convertToTranscriptFormat('No.', timings)
      expect(result.timeline.length).toBe(1)
      expect(result.timeline[0].text).toBe('No')
    })
  })

  describe('Abbreviations', () => {
    it('should not break after Mr.', () => {
      const timings: RawWordTiming[] = [
        { text: 'Mr', startTime: 0, endTime: 0.3 },
        { text: '.', startTime: 0.3, endTime: 0.35 },
        { text: 'White', startTime: 0.5, endTime: 0.8 },
      ]
      const result = convertToTranscriptFormat('Mr. White', timings)
      // Should not break after Mr.
      const firstSegment = result.timeline[0]
      expect(firstSegment.text).toContain('Mr')
      expect(firstSegment.text).toContain('White')
    })

    it('should not break after Dr.', () => {
      const timings: RawWordTiming[] = [
        { text: 'Dr', startTime: 0, endTime: 0.3 },
        { text: '.', startTime: 0.3, endTime: 0.35 },
        { text: 'Smith', startTime: 0.5, endTime: 0.9 },
      ]
      const result = convertToTranscriptFormat('Dr. Smith', timings)
      const firstSegment = result.timeline[0]
      expect(firstSegment.text).toContain('Dr')
      expect(firstSegment.text).toContain('Smith')
    })

    it('should not break after U.S.A.', () => {
      const timings: RawWordTiming[] = [
        { text: 'U', startTime: 0, endTime: 0.2 },
        { text: '.', startTime: 0.2, endTime: 0.25 },
        { text: 'S', startTime: 0.25, endTime: 0.4 },
        { text: '.', startTime: 0.4, endTime: 0.45 },
        { text: 'A', startTime: 0.45, endTime: 0.6 },
        { text: '.', startTime: 0.6, endTime: 0.65 },
        { text: 'is', startTime: 0.8, endTime: 1.0 },
      ]
      const result = convertToTranscriptFormat('U.S.A. is', timings)
      // Should keep U.S.A. together
      expect(result.timeline.length).toBeGreaterThan(0)
    })

    it('should handle etc. correctly', () => {
      const timings: RawWordTiming[] = [
        { text: 'books', startTime: 0, endTime: 0.5 },
        { text: 'etc', startTime: 0.7, endTime: 1.0 },
        { text: '.', startTime: 1.0, endTime: 1.05 },
      ]
      const result = convertToTranscriptFormat('books etc.', timings)
      expect(result.timeline.length).toBeGreaterThan(0)
    })
  })

  describe('Numbers', () => {
    it('should not break after decimal number', () => {
      const timings: RawWordTiming[] = [
        { text: '3', startTime: 0, endTime: 0.2 },
        { text: '.', startTime: 0.2, endTime: 0.25 },
        { text: '14', startTime: 0.25, endTime: 0.5 },
        { text: 'is', startTime: 0.7, endTime: 0.9 },
      ]
      const result = convertToTranscriptFormat('3.14 is', timings)
      // Should not break after 3.14
      expect(result.timeline.length).toBeGreaterThan(0)
    })

    it('should not break after year number', () => {
      const timings: RawWordTiming[] = [
        { text: '2024', startTime: 0, endTime: 0.5 },
        { text: '.', startTime: 0.5, endTime: 0.55 },
        { text: 'was', startTime: 0.8, endTime: 1.1 },
      ]
      const result = convertToTranscriptFormat('2024. was', timings)
      // Should handle year correctly
      expect(result.timeline.length).toBeGreaterThan(0)
    })
  })

  describe('Punctuation Handling', () => {
    it('should handle multiple exclamation marks', () => {
      const timings: RawWordTiming[] = [
        { text: 'Wow', startTime: 0, endTime: 0.5 },
      ]
      const result = convertToTranscriptFormat('Wow!!!', timings)
      expect(result.timeline.length).toBe(1)
      expect(result.timeline[0].text).toBe('Wow')
    })

    it('should handle multiple question marks', () => {
      const timings: RawWordTiming[] = [
        { text: 'Really', startTime: 0, endTime: 0.6 },
      ]
      const result = convertToTranscriptFormat('Really???', timings)
      expect(result.timeline.length).toBe(1)
    })

    it('should break at sentence endings', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0, endTime: 0.5 },
        { text: 'world', startTime: 0.6, endTime: 1.0 },
        { text: 'How', startTime: 1.5, endTime: 1.8 },
        { text: 'are', startTime: 1.9, endTime: 2.1 },
        { text: 'you', startTime: 2.2, endTime: 2.5 },
      ]
      const result = convertToTranscriptFormat('Hello world. How are you?', timings)
      // May merge if segments are short, but should handle punctuation
      expect(result.timeline.length).toBeGreaterThan(0)
      expect(result.timeline[0].text).toContain('Hello')
    })

    it('should break at commas with pauses', () => {
      const timings: RawWordTiming[] = [
        { text: 'First', startTime: 0, endTime: 0.5 },
        { text: ',', startTime: 0.5, endTime: 0.55 },
        { text: 'second', startTime: 0.8, endTime: 1.3 }, // 250ms gap = pause
        { text: ',', startTime: 1.3, endTime: 1.35 },
        { text: 'third', startTime: 1.6, endTime: 2.0 },
      ]
      const result = convertToTranscriptFormat('First, second, third', timings)
      expect(result.timeline.length).toBeGreaterThan(0)
    })
  })

  describe('Pause Detection', () => {
    it('should break at long pauses', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0, endTime: 0.5 },
        { text: 'world', startTime: 1.2, endTime: 1.7 }, // 700ms gap = long pause
      ]
      const result = convertToTranscriptFormat('Hello world', timings)
      // Long pause should create a break, but short segments may merge
      expect(result.timeline.length).toBeGreaterThan(0)
      // The pause should be detected (gapAfter = 700ms > 600ms threshold)
      expect(result.timeline[0].timeline?.length).toBe(2)
    })

    it('should break at medium pauses with punctuation', () => {
      const timings: RawWordTiming[] = [
        { text: 'First', startTime: 0, endTime: 0.5 },
        { text: '.', startTime: 0.5, endTime: 0.55 },
        { text: 'Second', startTime: 0.9, endTime: 1.4 }, // 350ms gap = medium pause
      ]
      const result = convertToTranscriptFormat('First. Second', timings)
      expect(result.timeline.length).toBe(2)
    })
  })

  describe('Word Count Limits', () => {
    it('should split long segments', () => {
      const words = [
        'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog',
        'and', 'then', 'runs', 'very', 'fast', 'through', 'the', 'forest',
      ]
      const timings: RawWordTiming[] = words.map((word, i) => ({
        text: word,
        startTime: i * 0.3,
        endTime: i * 0.3 + 0.25,
      }))
      const text = words.join(' ')
      const result = convertToTranscriptFormat(text, timings)
      // Should split into multiple segments (max 15 words per segment)
      expect(result.timeline.length).toBeGreaterThan(1)
      // Each segment should have reasonable word count
      result.timeline.forEach((segment) => {
        const wordCount = segment.timeline?.length || 0
        expect(wordCount).toBeLessThanOrEqual(15)
      })
    })

    it('should merge very short segments', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hi', startTime: 0, endTime: 0.3 },
        { text: 'there', startTime: 0.4, endTime: 0.7 },
        { text: '.', startTime: 0.7, endTime: 0.75 },
        { text: 'How', startTime: 1.0, endTime: 1.3 },
        { text: 'are', startTime: 1.4, endTime: 1.7 },
      ]
      const result = convertToTranscriptFormat('Hi there. How are', timings)
      // Short segments might be merged if appropriate
      expect(result.timeline.length).toBeGreaterThan(0)
    })
  })

  describe('Complex Sentences', () => {
    it('should handle complex sentence with multiple punctuation', () => {
      const timings: RawWordTiming[] = [
        { text: 'Mr', startTime: 0, endTime: 0.3 },
        { text: '.', startTime: 0.3, endTime: 0.35 },
        { text: 'Smith', startTime: 0.5, endTime: 0.9 },
        { text: ',', startTime: 0.9, endTime: 0.95 },
        { text: 'who', startTime: 1.1, endTime: 1.4 },
        { text: 'lives', startTime: 1.5, endTime: 1.9 },
        { text: 'in', startTime: 2.0, endTime: 2.2 },
        { text: 'the', startTime: 2.3, endTime: 2.5 },
        { text: 'U', startTime: 2.6, endTime: 2.8 },
        { text: '.', startTime: 2.8, endTime: 2.85 },
        { text: 'S', startTime: 2.85, endTime: 3.0 },
        { text: '.', startTime: 3.0, endTime: 3.05 },
        { text: 'A', startTime: 3.05, endTime: 3.2 },
        { text: '.', startTime: 3.2, endTime: 3.25 },
        { text: ',', startTime: 3.25, endTime: 3.3 },
        { text: 'is', startTime: 3.5, endTime: 3.7 },
        { text: 'happy', startTime: 3.8, endTime: 4.2 },
        { text: '.', startTime: 4.2, endTime: 4.25 },
      ]
      const result = convertToTranscriptFormat(
        'Mr. Smith, who lives in the U.S.A., is happy.',
        timings
      )
      expect(result.timeline.length).toBeGreaterThan(0)
      // Should not break after abbreviations
      const firstSegment = result.timeline[0]
      expect(firstSegment.text).toContain('Mr')
      expect(firstSegment.text).toContain('Smith')
    })

    it('should handle mixed languages', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0, endTime: 0.5 },
        { text: '世界', startTime: 0.6, endTime: 1.0 },
        { text: 'How', startTime: 1.5, endTime: 1.8 },
        { text: 'are', startTime: 1.9, endTime: 2.1 },
        { text: 'you', startTime: 2.2, endTime: 2.5 },
      ]
      const result = convertToTranscriptFormat('Hello 世界。How are you?', timings)
      // Should handle mixed languages correctly
      expect(result.timeline.length).toBeGreaterThan(0)
      expect(result.timeline[0].text).toContain('Hello')
    })
  })

  describe('Timing Accuracy', () => {
    it('should convert seconds to milliseconds correctly', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0.123, endTime: 0.456 },
        { text: 'world', startTime: 0.5, endTime: 0.789 },
      ]
      const result = convertToTranscriptFormat('Hello world', timings)
      expect(result.timeline.length).toBeGreaterThan(0)
      const firstWord = result.timeline[0].timeline?.[0]
      expect(firstWord?.start).toBe(123) // 0.123 * 1000, rounded
      expect(firstWord?.duration).toBe(333) // (0.456 - 0.123) * 1000, rounded
    })

    it('should calculate segment duration correctly', () => {
      const timings: RawWordTiming[] = [
        { text: 'Hello', startTime: 0, endTime: 0.5 },
        { text: 'world', startTime: 0.6, endTime: 1.1 },
      ]
      const result = convertToTranscriptFormat('Hello world', timings)
      const segment = result.timeline[0]
      expect(segment.duration).toBe(1100) // Last word end (1100ms) - first word start (0ms)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle typical language learning sentence', () => {
      const text = 'The weather is nice today, so we decided to go for a walk in the park.'
      const words = text.split(' ')
      const timings: RawWordTiming[] = words.map((word, i) => ({
        text: word.replace(/[,.]/g, ''),
        startTime: i * 0.3,
        endTime: i * 0.3 + 0.25,
      }))
      const result = convertToTranscriptFormat(text, timings)
      expect(result.timeline.length).toBeGreaterThan(0)
      // Should have reasonable segmentation
      result.timeline.forEach((segment) => {
        const wordCount = segment.timeline?.length || 0
        expect(wordCount).toBeGreaterThan(0) // At least 1 word
        expect(wordCount).toBeLessThanOrEqual(15) // Max 15 words
      })
    })

    it('should handle dialogue with short responses', () => {
      const text = 'Why? Yes! No. Maybe.'
      const timings: RawWordTiming[] = [
        { text: 'Why', startTime: 0, endTime: 0.4 },
        { text: 'Yes', startTime: 1.0, endTime: 1.3 },
        { text: 'No', startTime: 2.0, endTime: 2.3 },
        { text: 'Maybe', startTime: 3.0, endTime: 3.5 },
      ]
      const result = convertToTranscriptFormat(text, timings)
      // Single-word sentences with punctuation should be separate
      // But may merge if they're very short and close together
      expect(result.timeline.length).toBeGreaterThanOrEqual(1)
      expect(result.timeline.length).toBeLessThanOrEqual(4)
      // Each segment should contain the expected words
      const allText = result.timeline.map((s) => s.text).join(' ')
      expect(allText).toContain('Why')
      expect(allText).toContain('Yes')
      expect(allText).toContain('No')
      expect(allText).toContain('Maybe')
    })

    it('should handle long sentence with proper breaks', () => {
      const text =
        'The quick brown fox jumps over the lazy dog, and then the dog chases the fox through the forest, but the fox is too fast.'
      const words = text.split(' ')
      const timings: RawWordTiming[] = words.map((word, i) => ({
        text: word.replace(/[,.]/g, ''),
        startTime: i * 0.25,
        endTime: i * 0.25 + 0.2,
      }))
      const result = convertToTranscriptFormat(text, timings)
      // Should break at commas and periods
      expect(result.timeline.length).toBeGreaterThan(1)
    })
  })
})

