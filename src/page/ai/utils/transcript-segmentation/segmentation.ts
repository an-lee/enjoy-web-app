/**
 * Word Segmentation Logic
 *
 * Segments words into optimal chunks for language learning follow-along reading.
 * Handles the main segmentation loop and force-break scenarios when segments get too long.
 */

import type { WordWithMetadata, WordSegment } from './types'
import { SEGMENTATION_CONFIG } from './constants'
import { shouldBreakAtPosition, findBestBreakPointInSegment } from './break-detection'

/**
 * Segment words into optimal chunks for language learning
 * Uses break detection to find the best break points
 *
 * @param words - All words with enriched metadata
 * @returns Array of word segments
 */
export function segmentWords(words: WordWithMetadata[]): WordSegment[] {
  if (words.length === 0) {
    return []
  }

  const segments: WordSegment[] = []
  let currentSegment: WordWithMetadata[] = []
  let currentWordCount = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    currentSegment.push(word)
    currentWordCount++

    // Check if we should break here
    const shouldBreak = shouldBreakAtPosition(words, i, currentWordCount)

    if (shouldBreak) {
      // Finalize current segment
      if (currentSegment.length > 0) {
        segments.push({ words: [...currentSegment] })
        currentSegment = []
        currentWordCount = 0
      }
    } else if (
      currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment &&
      i < words.length - 1
    ) {
      // If we're just over the soft max, prefer slightly overflowing to reach
      // a nearby strong boundary (sentence end / meaning-group boundary).
      // This avoids splitting fixed semantic units like "wasn't bad enough."
      if (shouldDelayForceBreak(words, i, currentWordCount)) {
        continue
      }

      // Force break if segment is too long
      // Try to find the best break point in the last few words
      const breakIndex = findBestBreakPointInSegment(currentSegment)
      if (breakIndex >= 0 && breakIndex < currentSegment.length - 1) {
        // Split at the best break point
        const firstPart = currentSegment.slice(0, breakIndex + 1)
        const secondPart = currentSegment.slice(breakIndex + 1)

        segments.push({ words: firstPart })
        currentSegment = secondPart
        currentWordCount = secondPart.length
      } else {
        // No good break point found, try to break at preferredWordsPerSegment
        const breakResult = findFallbackBreakPoint(currentSegment, currentWordCount)
        if (breakResult) {
          segments.push({ words: breakResult.firstPart })
          currentSegment = breakResult.secondPart
          currentWordCount = breakResult.secondPart.length
        } else {
          // Force break here if segment is at max length
          segments.push({ words: [...currentSegment] })
          currentSegment = []
          currentWordCount = 0
        }
      }
    }
  }

  // Add remaining words as final segment
  if (currentSegment.length > 0) {
    segments.push({ words: currentSegment })
  }

  return segments
}

/**
 * Decide whether we should postpone a force-break slightly, to reach a nearby strong boundary.
 * This is especially important for English where Compromise meaning groups represent "意群".
 */
function shouldDelayForceBreak(
  words: WordWithMetadata[],
  currentIndex: number,
  currentWordCount: number
): boolean {
  // Allow a small overflow window to reach a better breakpoint.
  // Keep this generic (not word-list based): driven by sentence ends / meaning-group boundaries.
  const overflowLookahead = 4
  const hardMaxWords = SEGMENTATION_CONFIG.maxWordsPerSegment + overflowLookahead

  if (currentWordCount >= hardMaxWords) {
    return false
  }

  // Look ahead for a strong boundary.
  // If we can hit one within a few words, postpone breaking now.
  for (let offset = 1; offset <= overflowLookahead; offset++) {
    const idx = currentIndex + offset
    if (idx >= words.length) {
      break
    }

    const w = words[idx]
    if (w.isSentenceEnd) {
      return true
    }

    // Meaning-group boundary is a safe semantic breakpoint (意群边界)
    if (w.isAtMeaningGroupBoundary) {
      return true
    }
  }

  return false
}

/**
 * Find a fallback break point when no ideal break point is found
 * Looks backwards from the end to find any reasonable break point
 */
function findFallbackBreakPoint(
  segment: WordWithMetadata[],
  currentWordCount: number
): { firstPart: WordWithMetadata[]; secondPart: WordWithMetadata[] } | null {
  // Look backwards from the end to find a good break point
  for (let j = segment.length - 1; j >= SEGMENTATION_CONFIG.preferredWordsPerSegment; j--) {
    const checkWord = segment[j]
    // Check if this position has any break signal
    if (
      checkWord.isAtMeaningGroupBoundary ||
      checkWord.punctuationWeight > 0 ||
      checkWord.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold
    ) {
      // Found a good break point
      const firstPart = segment.slice(0, j + 1)
      const secondPart = segment.slice(j + 1)

      return { firstPart, secondPart }
    }
  }

  // If still no break point, break at preferredWordsPerSegment
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment + 3) {
    const breakAt = SEGMENTATION_CONFIG.preferredWordsPerSegment
    const firstPart = segment.slice(0, breakAt)
    const secondPart = segment.slice(breakAt)

    return { firstPart, secondPart }
  }

  return null
}

