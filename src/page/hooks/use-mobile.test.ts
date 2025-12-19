/**
 * Tests for useIsMobile hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth
  let mockMatchMedia: ReturnType<typeof vi.fn>
  let mediaQueryListener: (() => void) | null = null

  beforeEach(() => {
    // Reset listener
    mediaQueryListener = null

    // Create a mock that captures the listener
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'change') {
          mediaQueryListener = listener
        }
      }),
      removeEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'change' && mediaQueryListener === listener) {
          mediaQueryListener = null
        }
      }),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = mockMatchMedia as any
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    // Reset innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
  }

  it('should return false for desktop viewport (width >= 768)', () => {
    setWindowWidth(1024)

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for mobile viewport (width < 768)', () => {
    setWindowWidth(767)

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should return false for exactly 768px width (tablet breakpoint)', () => {
    setWindowWidth(768)

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should query correct media query breakpoint', () => {
    setWindowWidth(1024)
    renderHook(() => useIsMobile())
    // Breakpoint is 768, so query should be (max-width: 767px)
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('should update when viewport changes', () => {
    // Start with desktop
    setWindowWidth(1024)

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate viewport change to mobile
    if (mediaQueryListener) {
      act(() => {
        setWindowWidth(500)
        mediaQueryListener!()
      })
      expect(result.current).toBe(true)
    }
  })

  it('should cleanup listener on unmount', () => {
    setWindowWidth(1024)
    const mockRemoveEventListener = vi.fn()
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(max-width: 767px)',
      addEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'change') {
          mediaQueryListener = listener
        }
      }),
      removeEventListener: mockRemoveEventListener,
    })

    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should handle initial undefined state', () => {
    // The hook initially sets isMobile to undefined before useEffect runs
    // But returns !!isMobile which coerces undefined to false
    setWindowWidth(500)

    const { result } = renderHook(() => useIsMobile())
    // After useEffect runs, it should be true for mobile width
    expect(result.current).toBe(true)
  })

  describe('edge cases', () => {
    it('should handle very small widths', () => {
      setWindowWidth(320)
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })

    it('should handle very large widths', () => {
      setWindowWidth(2560)
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
    })
  })
})
