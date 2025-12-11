/**
 * Segment Merging Logic
 *
 * Merges very short segments with adjacent ones to improve readability.
 * Only merges if it doesn't make the result too long and respects audio pauses.
 */

import type { WordSegment } from './types'
import { SEGMENTATION_CONFIG, COMMON_ABBREVIATIONS } from './constants'

/**
 * Merge very short segments with adjacent ones
 * Only merges if it doesn't make the result too long
 * Preserves single-word sentences with strong punctuation (e.g., "Why?")
 *
 * @param segments - Array of word segments to potentially merge
 * @returns Array of merged segments
 */
export function mergeShortSegments(segments: WordSegment[]): WordSegment[] {
  if (segments.length <= 1) {
    return segments
  }

  const merged: WordSegment[] = []
  let i = 0

  while (i < segments.length) {
    const current = segments[i]

    // If this is the last segment, just add it
    if (i === segments.length - 1) {
      merged.push(current)
      break
    }

    const next = segments[i + 1]
    const lastWord = current.words[current.words.length - 1]

    // DECISION: Should we merge [current] + [next]?

    // Special case: Check if we are splitting an abbreviation like "Mr" + "."
    if (shouldMergeAbbreviation(current, next)) {
      merged.push({
        words: [...current.words, ...next.words],
      })
      i += 2
      continue
    }

    // 1. Check audio gap (Pause)
    // If there is a distinct pause between segments, DO NOT MERGE.
    if (lastWord.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      merged.push(current)
      i++
      continue
    }

    // 2. Check Punctuation
    // If current segment ends with distinct punctuation, DO NOT MERGE.
    const hasStrongPunctuation =
      lastWord.isSentenceEnd ||
      (lastWord.punctuationAfter &&
        [',', '，', ';', '；', ':', '：'].includes(lastWord.punctuationAfter))

    if (hasStrongPunctuation) {
      // Only merge if it's really short (1 word) AND the gap is tiny (< 100ms)
      const isVeryShort = current.words.length <= 1
      const isVeryFast = lastWord.gapAfter < 100

      if (!isVeryShort || !isVeryFast) {
        merged.push(current)
        i++
        continue
      }
    }

    // 3. Check Combined Length
    // Only merge if the result is still "short enough"
    const combinedLength = current.words.length + next.words.length
    if (combinedLength <= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
      // Merge them!
      merged.push({
        words: [...current.words, ...next.words],
      })
      i += 2
      continue
    }

    // Default: Don't merge
    merged.push(current)
    i++
  }

  return merged
}

/**
 * Check if we should merge an abbreviation that was split incorrectly
 * Example: "Mr" + "." + "Smith" should be merged
 */
function shouldMergeAbbreviation(current: WordSegment, _next: WordSegment): boolean {
  if (current.words.length >= 2) {
    const lastWord = current.words[current.words.length - 1]
    const secondLastWord = current.words[current.words.length - 2]
    if (
      lastWord.text === '.' &&
      COMMON_ABBREVIATIONS.has(secondLastWord.text.toLowerCase())
    ) {
      return true
    }
  }
  return false
}

