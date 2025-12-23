/**
 * Break Detection Logic
 *
 * Determines optimal break points for segmenting words into chunks.
 * Uses a scoring system considering multiple factors:
 * - Punctuation marks
 * - Audio pauses (breathing points)
 * - Sentence boundaries
 * - Meaning group boundaries (意群)
 * - Word count limits
 * - Semantic coherence
 */

import type { WordWithMetadata } from './types'
import { SEGMENTATION_CONFIG, NO_BREAK_WORDS } from './constants'

/**
 * Determine if we should break at the current position
 * Considers meaning groups (意群) to avoid breaking semantic units
 *
 * @param words - All words with metadata
 * @param currentIndex - Current word index
 * @param currentWordCount - Number of words in current segment
 * @returns True if we should break at this position
 */
export function shouldBreakAtPosition(
  words: WordWithMetadata[],
  currentIndex: number,
  currentWordCount: number
): boolean {
  if (currentIndex === words.length - 1) {
    // Always break at the end
    return true
  }

  const word = words[currentIndex]

  // Avoid breaking in the middle of a meaning group (意群)
  // Unless there's a very strong break signal (sentence end)
  if (word.isInMeaningGroup && !word.isSentenceEnd) {
    // Don't break if we're inside a meaning group and it's not a sentence end
    // Wait until we reach the boundary
    if (!word.isAtMeaningGroupBoundary) {
      return false
    }
  }

  // Special case: Single-word sentences with strong punctuation
  // Examples: "Why?", "Yes!", "No."
  // These should always break even if they're only 1 word
  if (currentWordCount === 1 && word.isSentenceEnd) {
    return true
  }

  // Special case: Very short segments (1-2 words) with sentence-ending punctuation
  // Allow breaking if there's a clear sentence end signal
  if (currentWordCount <= 2 && word.isSentenceEnd) {
    // Check if there's also a pause to confirm it's a real break
    if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      return true
    }
  }

  // Calculate break score based on multiple factors
  let breakScore = calculateBreakScore(word, currentWordCount)

  // Factor 6: Avoid breaking too early (unless there's a very strong signal)
  if (currentWordCount < SEGMENTATION_CONFIG.minWordsPerSegment) {
    // Only break if there's a very strong signal
    if (breakScore < 10) {
      return false
    }
  }

  // PRIORITY 1: If we're at a meaning group boundary and have enough words, BREAK
  if (word.isAtMeaningGroupBoundary && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    return true
  }

  // PRIORITY 1.5: Heuristic - Break before clause-starting words
  if (shouldBreakBeforeClauseStart(words, currentIndex, currentWordCount)) {
    return true
  }

  // PRIORITY 2: If we have >= preferredWordsPerSegment words, be aggressive about breaking
  // But also check if breaking here would leave too few words for the next segment
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    const isPause = word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold
    const isBadBreakWord = NO_BREAK_WORDS.has(word.text.toLowerCase().trim())

    // Don't break on pause if it's a bad break word (unless very long pause)
    const validPause = isPause && (!isBadBreakWord || word.gapAfter >= SEGMENTATION_CONFIG.longPauseThreshold)

    // Check how many words would remain after this break
    const remainingWords = words.length - currentIndex - 1

    // If breaking here would leave very few words (< 2), and we're not at max length,
    // consider delaying the break to create more balanced segments
    if (remainingWords < 2 && currentWordCount < SEGMENTATION_CONFIG.maxWordsPerSegment - 1) {
      // Only break if there's a very strong signal (sentence end or strong punctuation)
      if (word.isSentenceEnd || (word.punctuationWeight >= 6 && !word.isAbbreviation)) {
        return true
      }
      // Otherwise, delay breaking to accumulate more words
      return false
    }

    if (
      word.punctuationWeight > 0 ||
      validPause ||
      word.isAtMeaningGroupBoundary ||
      breakScore >= 5
    ) {
      return true
    }

    // Even without strong signals, if we're getting close to max, break
    if (currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment - 3) {
      // Force break to prevent overly long segments
      if (word.punctuationWeight > 0 || word.isAtMeaningGroupBoundary || breakScore >= 3) {
        return true
      }
    }
  }

  // PRIORITY 3: If we have fewer words, only break with strong signals
  if (currentWordCount < SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    const hasWeakSignals =
      word.punctuationWeight > 0 ||
      word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold ||
      word.isAtMeaningGroupBoundary

    if (!hasWeakSignals && breakScore < 8) {
      return false
    }
  }

  // Break if score is high enough
  if (breakScore >= 8) {
    return true
  }

  // Special case: Meaning group boundary with enough words
  if (word.isAtMeaningGroupBoundary && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    return true
  }

  // Special case: Comma/semicolon with enough words and main clause starter
  if (shouldBreakAtComma(words, currentIndex, currentWordCount, word)) {
    return true
  }

  // Don't break if score is too low
  return false
}

/**
 * Calculate break score based on multiple factors
 */
function calculateBreakScore(word: WordWithMetadata, currentWordCount: number): number {
  let breakScore = 0

  // Factor 1: Punctuation weight (strong indicator, but ignore abbreviations)
  if (word.punctuationWeight > 0 && !word.isAbbreviation) {
    breakScore += word.punctuationWeight
  }

  // Factor 2: Sentence end detection (stronger than just punctuation weight)
  if (word.isSentenceEnd) {
    breakScore += 12 // Even stronger than regular punctuation
  }

  // Factor 3: Pause detection (natural breathing point)
  if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
    const textLower = word.text.toLowerCase().trim()
    if (NO_BREAK_WORDS.has(textLower)) {
      if (word.gapAfter < SEGMENTATION_CONFIG.longPauseThreshold) {
        // Ignore this pause, it's likely a hesitation after a function word
      } else {
        breakScore += 8 // Strong pause (force break even for bad words if long enough)
      }
    } else {
      // Normal pause
      if (word.gapAfter >= SEGMENTATION_CONFIG.longPauseThreshold) {
        breakScore += 8 // Strong pause
      } else {
        breakScore += 4 // Medium pause
      }
    }
  }

  // Factor 4: Word count (prefer breaking near preferred length)
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    const hasAnySignal =
      word.punctuationWeight > 0 ||
      word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold ||
      word.isAtMeaningGroupBoundary ||
      word.isSentenceEnd
    if (hasAnySignal) {
      breakScore += 3
    }
    // Also add score if we're significantly over preferred length
    if (currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment - 2) {
      breakScore += 2
    }
  }

  // Factor 5: Meaning group boundaries (意群边界)
  if (word.isAtMeaningGroupBoundary) {
    breakScore += 5
  } else if (word.isInMeaningGroup) {
    // Penalize breaking inside meaning groups
    breakScore -= 3
  }

  return breakScore
}

/**
 * Check if we should break before a clause-starting word
 * This creates natural breaks at semantic boundaries
 */
function shouldBreakBeforeClauseStart(
  words: WordWithMetadata[],
  currentIndex: number,
  currentWordCount: number
): boolean {
  if (currentIndex >= words.length - 1 || currentWordCount < SEGMENTATION_CONFIG.minWordsPerSegment) {
    return false
  }

  const nextWord = words[currentIndex + 1]
  const nextWordText = nextWord.text.toLowerCase()

  // Break before relative pronouns (who, which, that, whom, whose)
  if (['who', 'which', 'that', 'whom', 'whose'].includes(nextWordText)) {
    return true
  }

  // Break before question words that start object clauses
  if (
    ['what', 'how', 'why', 'when', 'where'].includes(nextWordText) &&
    currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment + 1
  ) {
    return true
  }

  // Break before main clause starters if current word ends with comma
  const mainClauseStarters = [
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'this',
    'that',
    'these',
    'those',
  ]
  if (mainClauseStarters.includes(nextWordText)) {
    const word = words[currentIndex]
    const currentWordHasComma =
      word.punctuationAfter === ',' ||
      word.punctuationAfter === '，' ||
      word.text.endsWith(',') ||
      word.text.endsWith('，')
    if (currentWordHasComma && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
      return true
    }
  }

  return false
}

/**
 * Check if we should break at a comma/semicolon position
 */
function shouldBreakAtComma(
  words: WordWithMetadata[],
  currentIndex: number,
  currentWordCount: number,
  word: WordWithMetadata
): boolean {
  const hasComma =
    word.punctuationAfter === ',' ||
    word.punctuationAfter === '，' ||
    word.text.endsWith(',') ||
    word.text.endsWith('，')
  const hasSemicolon =
    word.punctuationAfter === ';' ||
    word.punctuationAfter === '；' ||
    word.text.endsWith(';') ||
    word.text.endsWith('；')

  if (!hasComma && !hasSemicolon) {
    return false
  }

  if (currentWordCount < SEGMENTATION_CONFIG.minWordsPerSegment) {
    return false
  }

  // If there's a pause, definitely break
  if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
    return true
  }

  // Check if next word starts a new main clause
  if (currentIndex < words.length - 1) {
    const nextWord = words[currentIndex + 1]
    const nextWordText = nextWord.text.toLowerCase()
    const mainClauseStarters = [
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'this',
      'that',
      'these',
      'those',
    ]

    if (mainClauseStarters.includes(nextWordText)) {
      return true
    }
  }

  // Even without pause or main clause starter, break if we have enough words
  if (currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment + 2) {
    return true
  }

  return false
}

/**
 * Find the best break point within a segment that's too long
 * Looks for punctuation or pauses in the last few words
 * Avoids breaking at abbreviations, entities, and inside meaning groups
 *
 * @param segment - Current segment that's too long
 * @returns Index of the best break point within the segment
 */
export function findBestBreakPointInSegment(segment: WordWithMetadata[]): number {
  // Look back through the segment for a good break point.
  // Important: never return the last word as a breakpoint, otherwise we create
  // pathological "one-word tail" segments (e.g. "... bad" / "enough.").
  if (segment.length < 2) {
    return -1
  }

  const lastBreakCandidateIndex = segment.length - 2
  const lookback = Math.min(12, lastBreakCandidateIndex + 1) // scan up to 12 words back (or full segment if shorter)
  const startIndex = Math.max(0, lastBreakCandidateIndex - lookback + 1)

  let bestIndex = -1
  let bestScore = 0

  for (let i = startIndex; i <= lastBreakCandidateIndex; i++) {
    const word = segment[i]

    // Skip abbreviations - don't break after them
    if (word.isAbbreviation) {
      continue
    }

    // Skip "bad break words" - don't break after articles/prepositions
    if (NO_BREAK_WORDS.has(word.text.toLowerCase().trim()) && !word.punctuationWeight) {
      continue
    }

    // Prefer breaking at meaning group boundaries
    // Avoid breaking inside meaning groups
    if (word.isInMeaningGroup && !word.isAtMeaningGroupBoundary) {
      continue
    }

    let score = 0

    // Prefer sentence-ending punctuation breaks
    if (word.isSentenceEnd) {
      score += 15 // Very strong preference
    } else if (word.punctuationWeight > 0) {
      score += word.punctuationWeight * 2
    }

    // Prefer meaning group boundaries
    if (word.isAtMeaningGroupBoundary) {
      score += 8
    }

    // Prefer pause breaks
    if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      score += 3
    }

    // Prefer breaking closer to preferred length
    const wordsBefore = i + 1
    if (
      wordsBefore >= SEGMENTATION_CONFIG.minWordsPerSegment &&
      wordsBefore <= SEGMENTATION_CONFIG.preferredWordsPerSegment
    ) {
      score += 2
    }

    // Penalize breakpoints that would leave a 1-word tail in the forced-split remainder
    const wordsAfter = segment.length - (i + 1)
    if (wordsAfter === 1) {
      score -= 6
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

