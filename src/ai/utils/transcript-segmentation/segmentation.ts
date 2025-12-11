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
      // Force break if segment is too long
      // Try to find the best break point in the last few words
      const breakIndex = findBestBreakPointInSegment(currentSegment)
      if (breakIndex > 0 && breakIndex < currentSegment.length) {
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

