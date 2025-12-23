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
 * Segment words within a single sentence
 * Handles long sentences by breaking at punctuation, pauses, and meaning groups
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

