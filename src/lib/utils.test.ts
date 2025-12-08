/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (class names utility)', () => {
  it('should merge single class', () => {
    expect(cn('class1')).toBe('class1')
  })

  it('should merge multiple classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'active')).toBe('base')
  })

  it('should handle array of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('should handle object notation', () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3')
  })

  it('should handle mixed inputs', () => {
    expect(cn('base', ['array1'], { obj: true })).toBe('base array1 obj')
  })

  it('should handle undefined and null', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })

  // Tailwind merge specific tests
  describe('Tailwind CSS class merging', () => {
    it('should merge conflicting padding classes', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8')
    })

    it('should merge conflicting margin classes', () => {
      expect(cn('m-2', 'm-4')).toBe('m-4')
    })

    it('should merge conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should merge conflicting background color classes', () => {
      expect(cn('bg-white', 'bg-black')).toBe('bg-black')
    })

    it('should keep non-conflicting classes', () => {
      expect(cn('p-4', 'm-4', 'text-red-500')).toBe('p-4 m-4 text-red-500')
    })

    it('should handle responsive variants', () => {
      expect(cn('p-4', 'md:p-6', 'lg:p-8')).toBe('p-4 md:p-6 lg:p-8')
    })

    it('should merge conflicting responsive classes', () => {
      expect(cn('md:p-4', 'md:p-8')).toBe('md:p-8')
    })

    it('should handle state variants', () => {
      expect(cn('hover:bg-blue-500', 'hover:bg-red-500')).toBe('hover:bg-red-500')
    })

    it('should handle flexbox classes', () => {
      expect(cn('flex', 'flex-col', 'items-center')).toBe('flex flex-col items-center')
    })

    it('should handle width/height conflicts', () => {
      expect(cn('w-4', 'w-8')).toBe('w-8')
      expect(cn('h-4', 'h-8')).toBe('h-8')
    })

    it('should handle border conflicts', () => {
      expect(cn('border-2', 'border-4')).toBe('border-4')
      expect(cn('border-red-500', 'border-blue-500')).toBe('border-blue-500')
    })

    it('should handle rounded conflicts', () => {
      expect(cn('rounded-sm', 'rounded-lg')).toBe('rounded-lg')
    })
  })
})
