/**
 * useTextSelection Hook
 *
 * Detects text selection within a container element and provides
 * the selected text and its position for displaying a popover panel.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

export interface TextSelection {
  /** Selected text content */
  text: string
  /** Bounding rectangle of the selection */
  rect: DOMRect
  /** Container element that contains the selection */
  container: HTMLElement
}

export interface UseTextSelectionOptions {
  /** Whether selection detection is enabled */
  enabled?: boolean
  /** Minimum length of selection to trigger (default: 1) */
  minLength?: number
  /** Maximum length of selection to trigger (default: 100) */
  maxLength?: number
  /** Callback when selection changes */
  onSelectionChange?: (selection: TextSelection | null) => void
}

export interface UseTextSelectionReturn<T extends HTMLElement = HTMLElement> {
  /** Current text selection or null */
  selection: TextSelection | null
  /** Clear the current selection */
  clearSelection: () => void
  /** Ref to attach to the container element */
  containerRef: React.RefObject<T | null>
}

/**
 * Hook to detect text selection within a container
 */
export function useTextSelection<T extends HTMLElement = HTMLElement>(
  options: UseTextSelectionOptions = {}
): UseTextSelectionReturn<T> {
  const {
    enabled = true,
    minLength = 1,
    maxLength = 100,
    onSelectionChange,
  } = options

  const containerRef = useRef<T>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)

  const clearSelection = useCallback(() => {
    setSelection(null)
    onSelectionChange?.(null)
    // Clear browser selection
    if (window.getSelection) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
      }
    }
  }, [onSelectionChange])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setSelection(null)
        onSelectionChange?.(null)
        return
      }

      const range = sel.getRangeAt(0)
      const selectedText = range.toString().trim()

      // Check if selection is within our container
      const container = containerRef.current
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelection(null)
        onSelectionChange?.(null)
        return
      }

      // Check length constraints
      if (selectedText.length < minLength || selectedText.length > maxLength) {
        setSelection(null)
        onSelectionChange?.(null)
        return
      }

      // Get bounding rectangle
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setSelection(null)
        onSelectionChange?.(null)
        return
      }

      const newSelection: TextSelection = {
        text: selectedText,
        rect,
        container,
      }

      setSelection(newSelection)
      onSelectionChange?.(newSelection)
    }

    // Listen to selection changes
    document.addEventListener('selectionchange', handleSelectionChange)

    // Also listen to mouse up (when user finishes selecting)
    document.addEventListener('mouseup', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleSelectionChange)
    }
  }, [enabled, minLength, maxLength, onSelectionChange])

  // Clear selection when clicking outside
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleClickOutside = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      // If click is outside the container, clear selection
      if (!container.contains(e.target as Node)) {
        clearSelection()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [enabled, clearSelection])

  return {
    selection,
    clearSelection,
    containerRef,
  }
}

