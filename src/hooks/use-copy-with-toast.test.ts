/**
 * Tests for useCopyWithToast hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock react-i18next - must be before imports that use it
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
  }),
}))

// Mock @uidotdev/usehooks
const copyToClipboardMock = vi.fn()
vi.mock('@uidotdev/usehooks', () => ({
  useCopyToClipboard: () => [null, copyToClipboardMock],
}))

// Mock sonner - use inline factory to avoid hoisting issues
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocking
import { useCopyWithToast } from './use-copy-with-toast'
import { toast } from 'sonner'

describe('useCopyWithToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    copyToClipboardMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return copy function and copied state', () => {
    const { result } = renderHook(() => useCopyWithToast())

    expect(result.current.copy).toBeDefined()
    expect(typeof result.current.copy).toBe('function')
    expect(result.current.copied).toBe(false)
  })

  describe('copy function', () => {
    it('should copy text to clipboard', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('test text')
      })

      expect(copyToClipboardMock).toHaveBeenCalledWith('test text')
    })

    it('should show success toast on successful copy', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('test text')
      })

      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
    })

    it('should show custom success message when provided', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('test text', { successMessage: 'Custom success!' })
      })

      expect(toast.success).toHaveBeenCalledWith('Custom success!')
    })

    it('should set copied state to true after copy', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('test text')
      })

      expect(result.current.copied).toBe(true)
    })

    it('should reset copied state after 2 seconds', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('test text')
      })

      expect(result.current.copied).toBe(true)

      // Advance timers by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.copied).toBe(false)
    })

    it('should show error toast when copy fails', async () => {
      copyToClipboardMock.mockRejectedValueOnce(new Error('Copy failed'))
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        try {
          await result.current.copy('test text')
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to copy')
    })

    it('should show custom error message when provided', async () => {
      copyToClipboardMock.mockRejectedValueOnce(new Error('Copy failed'))
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        try {
          await result.current.copy('test text', { errorMessage: 'Custom error!' })
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith('Custom error!')
    })

    it('should throw error when copy fails', async () => {
      const error = new Error('Copy failed')
      copyToClipboardMock.mockRejectedValueOnce(error)
      const { result } = renderHook(() => useCopyWithToast())

      await expect(
        act(async () => {
          await result.current.copy('test text')
        })
      ).rejects.toThrow('Copy failed')
    })

    it('should not set copied to true when copy fails', async () => {
      copyToClipboardMock.mockRejectedValueOnce(new Error('Copy failed'))
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        try {
          await result.current.copy('test text')
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.copied).toBe(false)
    })
  })

  describe('multiple copies', () => {
    it('should handle multiple sequential copies', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('first')
      })
      expect(copyToClipboardMock).toHaveBeenCalledWith('first')
      expect(result.current.copied).toBe(true)

      await act(async () => {
        await result.current.copy('second')
      })
      expect(copyToClipboardMock).toHaveBeenCalledWith('second')
      expect(result.current.copied).toBe(true)
    })

    it('should reset copied state correctly between copies', async () => {
      const { result } = renderHook(() => useCopyWithToast())

      await act(async () => {
        await result.current.copy('first')
      })
      expect(result.current.copied).toBe(true)

      // Advance time to reset
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(result.current.copied).toBe(false)

      // Copy again
      await act(async () => {
        await result.current.copy('second')
      })
      expect(result.current.copied).toBe(true)
    })
  })
})
