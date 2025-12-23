/**
 * Word Segmentation Logic
 *
 * Segments words into optimal chunks for language learning follow-along reading.
 * First groups words by sentences (based on punctuation), then segments within each sentence.
 * Handles the main segmentation loop and force-break scenarios when segments get too long.
 */

import type { WordWithMetadata, WordSegment } from './types'
import { SEGMENTATION_CONFIG } from './constants'
import { shouldBreakAtPosition, findBestBreakPointInSegment } from './break-detection'

/**
 * Group words into sentences based on sentence-ending punctuation
 *
 * @param words - All words with enriched metadata
 * @returns Array of sentence groups (each is an array of words)
 */
function groupWordsIntoSentences(words: WordWithMetadata[]): WordWithMetadata[][] {
  if (words.length === 0) {
    return []
  }

  const sentences: WordWithMetadata[][] = []
  let currentSentence: WordWithMetadata[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    currentSentence.push(word)

    // Check if this word ends a sentence
    if (word.isSentenceEnd) {
      // Finalize current sentence
      if (currentSentence.length > 0) {
        sentences.push([...currentSentence])
        currentSentence = []
      }
    }
  }

  // Add remaining words as final sentence (if any)
  if (currentSentence.length > 0) {
    sentences.push(currentSentence)
  }

  return sentences
}

/**
 * Find the best break point near a target position
 * Looks for punctuation, pauses, and meaning group boundaries within a search window
 *
 * @param sentenceWords - Words in the sentence
 * @param targetIndex - Target index for ideal break point
 * @param searchWindow - Number of words to search before and after target
 * @returns Best break point index, or -1 if none found
 */
function findBestBreakNearTarget(
  sentenceWords: WordWithMetadata[],
  targetIndex: number,
  searchWindow: number = 3
): number {
  const startIndex = Math.max(0, targetIndex - searchWindow)
  const endIndex = Math.min(sentenceWords.length - 1, targetIndex + searchWindow)

  let bestIndex = -1
  let bestScore = 0

  for (let i = startIndex; i <= endIndex; i++) {
    const word = sentenceWords[i]
    let score = 0

    // Prefer punctuation breaks
    if (word.punctuationWeight > 0 && !word.isAbbreviation) {
      score += word.punctuationWeight * 3
    }

    // Prefer meaning group boundaries
    if (word.isAtMeaningGroupBoundary) {
      score += 5
    }

    // Prefer pause breaks
    if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      score += 3
    }

    // Prefer positions closer to target
    const distance = Math.abs(i - targetIndex)
    score += Math.max(0, searchWindow - distance)

    // Avoid breaking at "bad break words" unless there's punctuation
    const isBadBreakWord = word.text.toLowerCase().trim() === 'of' ||
      word.text.toLowerCase().trim() === 'the' ||
      word.text.toLowerCase().trim() === 'a' ||
      word.text.toLowerCase().trim() === 'an'
    if (isBadBreakWord && !word.punctuationWeight && word.gapAfter < SEGMENTATION_CONFIG.pauseThreshold) {
      score -= 5
    }

    // Avoid breaking inside meaning groups
    if (word.isInMeaningGroup && !word.isAtMeaningGroupBoundary) {
      score -= 3
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

/**
 * Intelligently segment a long sentence into evenly-sized segments
 * Prioritizes creating segments of similar length
 *
 * @param sentenceWords - Words in a long sentence
 * @returns Array of word segments
 */
function segmentLongSentenceEvenly(
  sentenceWords: WordWithMetadata[]
): WordSegment[] {
  const totalWords = sentenceWords.length
  const preferredWords = SEGMENTATION_CONFIG.preferredWordsPerSegment

  // Calculate ideal number of segments
  const idealSegmentCount = Math.ceil(totalWords / preferredWords)
  const wordsPerSegment = Math.ceil(totalWords / idealSegmentCount)

  const segments: WordSegment[] = []
  let currentIndex = 0

  for (let segmentNum = 0; segmentNum < idealSegmentCount; segmentNum++) {
    const isLastSegment = segmentNum === idealSegmentCount - 1

    if (isLastSegment) {
      // Last segment: take all remaining words
      const remainingWords = sentenceWords.slice(currentIndex)
      if (remainingWords.length > 0) {
        segments.push({ words: remainingWords })
      }
      break
    }

    // Calculate target break point for this segment
    const targetBreakIndex = currentIndex + wordsPerSegment - 1

    // Find the best break point near the target
    const bestBreakIndex = findBestBreakNearTarget(sentenceWords, targetBreakIndex, 4)

    let actualBreakIndex: number
    if (bestBreakIndex >= 0 && bestBreakIndex >= currentIndex) {
      actualBreakIndex = bestBreakIndex
    } else {
      // Fallback: use target or find any reasonable break point
      actualBreakIndex = Math.min(targetBreakIndex, sentenceWords.length - 1)
      
      // Try to find any break point in the range
      for (let i = Math.max(currentIndex + 1, actualBreakIndex - 2); i <= Math.min(actualBreakIndex + 2, sentenceWords.length - 1); i++) {
        const word = sentenceWords[i]
        if (word.punctuationWeight > 0 || word.isAtMeaningGroupBoundary || word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
          actualBreakIndex = i
          break
        }
      }
    }

    // Ensure we don't create segments that are too short
    const segmentLength = actualBreakIndex - currentIndex + 1
    if (segmentLength < 2 && segmentNum < idealSegmentCount - 1) {
      // If segment would be too short, try to extend it
      const minLength = Math.min(3, wordsPerSegment - 1)
      actualBreakIndex = Math.min(currentIndex + minLength, sentenceWords.length - 1)
    }

    // Create segment
    const segmentWords = sentenceWords.slice(currentIndex, actualBreakIndex + 1)
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords })
    }

    currentIndex = actualBreakIndex + 1

    // Safety check: prevent infinite loop
    if (currentIndex >= sentenceWords.length) {
      break
    }
  }

  return segments
}

/**
 * Segment words within a single sentence
 * Handles long sentences by breaking at punctuation, pauses, and meaning groups
 * For very long sentences, uses intelligent even segmentation
 *
 * @param sentenceWords - Words in a single sentence
 * @param allWords - All words (for context in break detection)
 * @param sentenceStartIndex - Starting index of this sentence in allWords
 * @returns Array of word segments for this sentence
 */
function segmentSentence(
  sentenceWords: WordWithMetadata[],
  allWords: WordWithMetadata[],
  sentenceStartIndex: number
): WordSegment[] {
  if (sentenceWords.length === 0) {
    return []
  }

  // For very long sentences (more than 2x maxWordsPerSegment), use even segmentation
  const isVeryLongSentence = sentenceWords.length > SEGMENTATION_CONFIG.maxWordsPerSegment * 2

  if (isVeryLongSentence) {
    return segmentLongSentenceEvenly(sentenceWords)
  }

  // For shorter sentences, use the original incremental approach
  const segments: WordSegment[] = []
  let currentSegment: WordWithMetadata[] = []
  let currentWordCount = 0

  for (let i = 0; i < sentenceWords.length; i++) {
    const word = sentenceWords[i]
    const globalIndex = sentenceStartIndex + i
    currentSegment.push(word)
    currentWordCount++

    // Check if we should break here (within sentence)
    const shouldBreak = shouldBreakAtPosition(allWords, globalIndex, currentWordCount)

    if (shouldBreak) {
      // Finalize current segment
      if (currentSegment.length > 0) {
        segments.push({ words: [...currentSegment] })
        currentSegment = []
        currentWordCount = 0
      }
    } else if (
      currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment &&
      i < sentenceWords.length - 1
    ) {
      // If we're just over the soft max, prefer slightly overflowing to reach
      // a nearby strong boundary (sentence end / meaning-group boundary).
      // This avoids splitting fixed semantic units like "wasn't bad enough."
      if (shouldDelayForceBreak(allWords, globalIndex, currentWordCount)) {
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
 * Segment words into optimal chunks for language learning
 * First groups words by sentences, then segments within each sentence
 *
 * @param words - All words with enriched metadata
 * @returns Array of word segments
 */
export function segmentWords(words: WordWithMetadata[]): WordSegment[] {
  if (words.length === 0) {
    return []
  }

  // Step 1: Group words into sentences based on sentence-ending punctuation
  const sentences = groupWordsIntoSentences(words)

  // Step 2: Segment each sentence independently
  const allSegments: WordSegment[] = []
  let wordIndex = 0

  for (const sentence of sentences) {
    const sentenceSegments = segmentSentence(sentence, words, wordIndex)
    allSegments.push(...sentenceSegments)
    wordIndex += sentence.length
  }

  return allSegments
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

