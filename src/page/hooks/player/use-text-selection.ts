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
  /** Ref to popover/panel element that should not trigger selection clear when clicked */
  popoverRef?: React.RefObject<HTMLElement | null>
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
    popoverRef,
  } = options

  const containerRef = useRef<T>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)
  // Keep a ref to track the last active element that was clicked
  // This helps us determine if a click happened inside the popover
  const lastClickTargetRef = useRef<EventTarget | null>(null)

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

  // Check if a target element is inside the popover
  const isInsidePopover = useCallback((target: Node | null): boolean => {
    if (!target || !popoverRef) return false

    const popoverElement = popoverRef.current
    if (!popoverElement) return false

    // Check if target is inside the popover element
    return popoverElement.contains(target)
  }, [popoverRef])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleSelectionChange = () => {
      const sel = window.getSelection()

      // If selection is cleared, check if the click was inside popover
      if (!sel || sel.rangeCount === 0) {
        // Check if the last click was inside popover
        const lastClickTarget = lastClickTargetRef.current
        if (lastClickTarget && isInsidePopover(lastClickTarget as Node)) {
          // Don't clear selection if click was inside popover
          return
        }

        // Selection was cleared and click was not in popover, clear our state
        setSelection(null)
        onSelectionChange?.(null)
        return
      }

      const range = sel.getRangeAt(0)
      const selectedText = range.toString().trim()

      // Check if selection is within our container
      const container = containerRef.current
      if (!container || !container.contains(range.commonAncestorContainer)) {
        // Selection is outside container, but check if click was in popover
        const lastClickTarget = lastClickTargetRef.current
        if (lastClickTarget && isInsidePopover(lastClickTarget as Node)) {
          return
        }

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
  }, [enabled, minLength, maxLength, onSelectionChange, isInsidePopover])

  // Track all mouse down events to capture click targets
  // This helps us determine if selection was cleared due to a click inside popover
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Store the click target for use in handleSelectionChange
      // This happens before selectionchange event fires
      lastClickTargetRef.current = e.target
    }

    document.addEventListener('mousedown', handleMouseDown, true) // Use capture phase
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [enabled])

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

      const target = e.target as Node

      // Check if click is inside the container
      if (container.contains(target)) {
        return
      }

      // Check if click is inside popover
      if (isInsidePopover(target)) {
        return // Click is inside popover, don't clear selection
      }

      // Click is outside both container and popover, clear selection
      clearSelection()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [enabled, clearSelection, isInsidePopover])

  return {
    selection,
    clearSelection,
    containerRef,
  }
}

