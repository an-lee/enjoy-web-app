/**
 * useAutoScroll Hook
 *
 * Handles automatic scrolling to the active transcript line when playing.
 * Uses element IDs for direct element lookup instead of index-based queries.
 * When scrollToEndLineId is provided, ensures the entire region is visible.
 */

import { useEffect, useRef } from 'react'
import type { TranscriptDisplayConfig } from '../../components/player/transcript/types'
import { SCROLL_OFFSET } from '../../components/player/transcript/constants'

export function useAutoScroll(
  scrollToLineId: string | null,
  isPlaying: boolean,
  config: TranscriptDisplayConfig,
  scrollAreaRef: React.RefObject<HTMLDivElement | null>,
  scrollToEndLineId?: string | null
) {
  const lastScrolledIdRef = useRef<string | null>(null)
  const lastScrolledEndIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      !config.autoScroll ||
      !isPlaying ||
      !scrollToLineId ||
      (scrollToLineId === lastScrolledIdRef.current &&
        scrollToEndLineId === lastScrolledEndIdRef.current)
    ) {
      return
    }

    lastScrolledIdRef.current = scrollToLineId
    lastScrolledEndIdRef.current = scrollToEndLineId ?? null

    // Get the scroll container
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const scrollContainer = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    // Direct element lookup using ID within the scroll area to ensure we get the correct element
    const startLine = scrollArea.querySelector(`#${CSS.escape(scrollToLineId)}`) as HTMLElement | null
    if (!startLine) return

    let targetScrollTop: number

    if (scrollToEndLineId) {
      // Scroll to ensure the entire region is visible
      const endLine = scrollArea.querySelector(`#${CSS.escape(scrollToEndLineId)}`) as HTMLElement | null

      if (endLine) {
        const startLineTop = startLine.offsetTop
        const endLineRect = endLine.getBoundingClientRect()
        const endLineBottom = endLine.offsetTop + endLineRect.height
        const viewportHeight = scrollContainer.clientHeight

        // Calculate the height of the entire region
        const regionHeight = endLineBottom - startLineTop

        if (config.scrollPosition === 'center') {
          // Center the region in the viewport
          targetScrollTop =
            startLineTop -
            (viewportHeight - regionHeight) / 2
        } else {
          // Position at top with offset, ensuring the end line is visible
          const minScrollTop = startLineTop - SCROLL_OFFSET
          const maxScrollTop = endLineBottom - viewportHeight
          // Use the smaller value to ensure both start and end are visible
          targetScrollTop = Math.min(minScrollTop, maxScrollTop)
        }
      } else {
        // Fallback to single line behavior if end line not found
        const lineRect = startLine.getBoundingClientRect()
        if (config.scrollPosition === 'center') {
          targetScrollTop =
            startLine.offsetTop -
            scrollContainer.clientHeight / 2 +
            lineRect.height / 2
        } else {
          targetScrollTop = startLine.offsetTop - SCROLL_OFFSET
        }
      }
    } else {
      // Single line scroll behavior
      const lineRect = startLine.getBoundingClientRect()

      if (config.scrollPosition === 'center') {
        // Center the active line
        targetScrollTop =
          startLine.offsetTop -
          scrollContainer.clientHeight / 2 +
          lineRect.height / 2
      } else {
        // Position at top with offset
        targetScrollTop = startLine.offsetTop - SCROLL_OFFSET
      }
    }

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: config.scrollBehavior,
    })
  }, [scrollToLineId, scrollToEndLineId, isPlaying, config.autoScroll, config.scrollBehavior, config.scrollPosition, scrollAreaRef])
}

