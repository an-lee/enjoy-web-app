/**
 * useAutoScroll Hook
 *
 * Handles automatic scrolling to the active transcript line when playing.
 */

import { useEffect, useRef } from 'react'
import type { TranscriptDisplayConfig } from './types'
import { SCROLL_OFFSET } from './constants'

export function useAutoScroll(
  activeLineIndex: number,
  isPlaying: boolean,
  config: TranscriptDisplayConfig,
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
) {
  const lastScrolledIndexRef = useRef<number>(-1)

  useEffect(() => {
    if (
      !config.autoScroll ||
      !isPlaying ||
      activeLineIndex < 0 ||
      activeLineIndex === lastScrolledIndexRef.current
    ) {
      return
    }

    lastScrolledIndexRef.current = activeLineIndex

    // Find the active line element
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const lineElements = scrollArea.querySelectorAll('[data-line-index]')
    const activeLine = lineElements[activeLineIndex] as HTMLElement | undefined

    if (!activeLine) return

    // Calculate scroll position
    const scrollContainer = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    const lineRect = activeLine.getBoundingClientRect()

    let targetScrollTop: number

    if (config.scrollPosition === 'center') {
      // Center the active line
      targetScrollTop =
        activeLine.offsetTop -
        scrollContainer.clientHeight / 2 +
        lineRect.height / 2
    } else {
      // Position at top with offset
      targetScrollTop = activeLine.offsetTop - SCROLL_OFFSET
    }

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: config.scrollBehavior,
    })
  }, [activeLineIndex, isPlaying, config.autoScroll, config.scrollBehavior, config.scrollPosition, scrollAreaRef])
}

