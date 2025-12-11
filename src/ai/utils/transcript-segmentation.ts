/**
 * Transcript Segmentation Utility
 *
 * Intelligently segments text-to-speech transcripts for language learning.
 * Optimized for follow-along reading practice by considering:
 * - Audio pauses (breathing points)
 * - Punctuation marks
 * - Word count (optimal segment length)
 * - Abbreviations and numbers (avoid false breaks)
 *
 * This module can be used by any TTS provider that generates word-level timestamps.
 */

import type { TTSTranscript, TTSTranscriptItem } from '../types'
import { isSentenceBoundary } from './multilingual-segmenter'

/**
 * Raw word timing data from TTS providers
 * Times are in seconds (will be converted to milliseconds)
 */
export interface RawWordTiming {
  text: string
  startTime: number // seconds
  endTime: number // seconds
}

/**
 * Common abbreviations that end with a period but should not cause sentence breaks
 * These are case-insensitive
 */
const COMMON_ABBREVIATIONS = new Set([
  // Titles and honorifics
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'esq',
  // Time and dates
  'am', 'pm', 'a.m', 'p.m', 'bc', 'ad', 'bce', 'ce',
  // Locations
  'us', 'usa', 'uk', 'u.s', 'u.s.a',
  // Common abbreviations
  'etc', 'vs', 'v', 'e.g', 'i.e', 'ex', 'inc', 'ltd', 'corp', 'co',
  'st', 'ave', 'blvd', 'rd', 'dr', 'ct', 'ln', 'pl', 'pkwy',
  // Academic
  'ph.d', 'm.d', 'b.a', 'm.a', 'b.s', 'm.s',
  // Measurements
  'ft', 'in', 'lb', 'oz', 'kg', 'g', 'mg', 'ml', 'l',
  // Technical
  'ca', 'approx', 'max', 'min',
])

/**
 * Configuration for transcript segmentation
 * Optimized for language learning follow-along reading
 */
const SEGMENTATION_CONFIG = {
  // Word count limits per segment (for readability)
  minWordsPerSegment: 3, // Minimum words in a segment (can be overridden for strong breaks)
  maxWordsPerSegment: 15, // Maximum words in a segment (ideal for follow-along)
  preferredWordsPerSegment: 8, // Preferred word count for optimal learning

  // Pause detection (in milliseconds)
  // Detects natural breathing points in speech
  pauseThreshold: 300, // Minimum gap between words to consider a pause
  longPauseThreshold: 600, // Longer pause indicating a stronger break

  // Punctuation weights (higher = stronger break point)
  punctuationWeights: {
    // Strong breaks (sentence endings)
    '.': 10,
    '!': 10,
    '?': 10,
    '。': 10,
    '！': 10,
    '？': 10,
    '…': 10,
    // Medium breaks (clauses)
    ',': 5,
    ';': 6,
    '，': 5,
    '；': 6,
    // Weak breaks (phrases)
    ':': 4,
    '：': 4,
    '-': 2,
    '—': 3,
  },
} as const

/**
 * Word with timing and metadata for segmentation
 */
interface WordWithMetadata {
  text: string
  start: number // milliseconds
  end: number // milliseconds
  duration: number // milliseconds
  gapAfter: number // milliseconds until next word (0 for last word)
  punctuationAfter?: string // punctuation immediately after this word
  punctuationWeight: number // weight of punctuation after this word
  isAbbreviation: boolean // true if this word is an abbreviation (e.g., "Mr.")
  isNumber: boolean // true if this word is a number
  isSentenceEnd: boolean // true if punctuation after this word indicates sentence end
}

/**
 * Convert raw word timings to TranscriptLine format
 * Intelligently segments text based on:
 * - Audio pauses (breathing points)
 * - Punctuation marks
 * - Word count (optimal for follow-along reading)
 * - Multilingual sentence boundaries (using Intl.Segmenter when available)
 *
 * All times are converted to milliseconds (integer)
 *
 * @param text - Original text that was synthesized
 * @param rawTimings - Word-level timing data from TTS provider (times in seconds)
 * @param language - Optional language code (e.g., 'en', 'zh', 'ja') for better segmentation
 * @returns Transcript with intelligently segmented timeline
 */
export function convertToTranscriptFormat(
  text: string,
  rawTimings: RawWordTiming[],
  language?: string
): TTSTranscript {
  if (rawTimings.length === 0) {
    return { timeline: [] }
  }

  // Convert raw timings to milliseconds and enrich with metadata
  const words: WordWithMetadata[] = rawTimings.map((raw, index) => {
    const start = Math.round(raw.startTime * 1000)
    const end = Math.round(raw.endTime * 1000)
    const duration = end - start

    // Calculate gap after this word
    const gapAfter =
      index < rawTimings.length - 1
        ? Math.round(rawTimings[index + 1].startTime * 1000) - end
        : 0

    // Extract punctuation after this word from the original text
    // Find the word in the text and check what follows it
    const wordText = raw.text.trim()
    const punctuationAfter = extractPunctuationAfterWord(text, wordText, index)

    // Get word position in text for sentence boundary detection
    const wordPosition = getWordPositionInText(text, wordText, index)

    // Check if this is an abbreviation (word ends with period and is in abbreviation list)
    const isAbbreviation = isAbbreviationWord(wordText, punctuationAfter)

    // Check if this word is a number (contains digits and is primarily numeric)
    // Examples: "3.14", "2024", "1,000" but not "3rd", "1st", "2nd"
    const cleanedWord = wordText.replace(/[^\d.,]/g, '')
    const isNumber = cleanedWord.length > 0 && /^\d+([.,]\d+)*$/.test(cleanedWord) &&
                     cleanedWord.length >= wordText.length * 0.5 // At least 50% digits

    // Determine if punctuation indicates sentence end (not abbreviation or number)
    // Use multilingual sentence boundary detection if available
    let isSentenceEnd = false
    if (punctuationAfter !== undefined && !isAbbreviation && !isNumber) {
      const isSentenceEndingPunctuation =
        punctuationAfter === '.' || punctuationAfter === '!' || punctuationAfter === '?' ||
        punctuationAfter === '。' || punctuationAfter === '！' || punctuationAfter === '？'

      if (isSentenceEndingPunctuation) {
        // Use Intl.Segmenter if available for more accurate detection
        if (wordPosition !== undefined && language) {
          // Check if this position is at a sentence boundary according to Intl.Segmenter
          // Position after the word and its punctuation
          const endPosition = wordPosition + wordText.length + (punctuationAfter ? 1 : 0)
          // Use Intl.Segmenter to verify, but fallback to punctuation check
          const isBoundary = isSentenceBoundary(text, endPosition, language)
          isSentenceEnd = isBoundary || isSentenceEndingPunctuation
        } else {
          // Fallback: use punctuation-based detection
          isSentenceEnd = isSentenceEndingPunctuation
        }
      }
    }

    // Calculate punctuation weight (0 if it's an abbreviation with period)
    let punctuationWeight = 0
    if (punctuationAfter && !isAbbreviation) {
      if (punctuationAfter in SEGMENTATION_CONFIG.punctuationWeights) {
        punctuationWeight = SEGMENTATION_CONFIG.punctuationWeights[
          punctuationAfter as keyof typeof SEGMENTATION_CONFIG.punctuationWeights
        ]
      }
    }

    return {
      text: wordText,
      start,
      end,
      duration,
      gapAfter,
      punctuationAfter,
      punctuationWeight,
      isAbbreviation,
      isNumber,
      isSentenceEnd,
    }
  })

  // Segment words into optimal chunks for follow-along reading
  const segments = segmentWords(words)

  // Convert segments to TTSTranscriptItem format
  const timeline: TTSTranscriptItem[] = segments.map((segment) => {
    const wordTimeline: TTSTranscriptItem[] = segment.words.map((w) => ({
      text: w.text,
      start: w.start,
      duration: w.duration,
    }))

    const segmentText = segment.words.map((w) => w.text).join(' ')
    const segmentStart = segment.words[0].start
    const lastWord = segment.words[segment.words.length - 1]
    const segmentEnd = lastWord.end
    const segmentDuration = segmentEnd - segmentStart

    return {
      text: segmentText,
      start: segmentStart,
      duration: segmentDuration,
      timeline: wordTimeline,
    }
  })

  return { timeline }
}

/**
 * Check if a word is an abbreviation
 * Handles both cases: word ending with period (e.g., "Mr.") or word followed by period (e.g., "Mr" + ".")
 */
function isAbbreviationWord(word: string, punctuationAfter?: string): boolean {
  // Check if word itself ends with period or is followed by period
  const hasPeriod = word.endsWith('.') || punctuationAfter === '.'

  if (!hasPeriod) {
    return false
  }

  // Remove trailing period(s) and check against abbreviation list
  const wordWithoutPeriod = word.replace(/\.+$/, '').toLowerCase()
  return COMMON_ABBREVIATIONS.has(wordWithoutPeriod)
}

/**
 * Get the position of a word in the text
 * Returns the start index of the word in the text
 */
function getWordPositionInText(
  text: string,
  word: string,
  wordIndex: number
): number | undefined {
  // Find all occurrences of the word in the text
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
  let match
  let occurrenceIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (occurrenceIndex === wordIndex) {
      return match.index
    }
    occurrenceIndex++
  }

  return undefined
}

/**
 * Extract punctuation that appears immediately after a word in the text
 * Handles multiple consecutive punctuation marks (e.g., "!!!", "???")
 */
function extractPunctuationAfterWord(
  text: string,
  word: string,
  wordIndex: number
): string | undefined {
  // Find all occurrences of the word in the text
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
  let match
  let occurrenceIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (occurrenceIndex === wordIndex) {
      const afterMatch = text.substring(match.index + match[0].length)
      // Match first punctuation mark (handles multiple like "!!!")
      const punctuationMatch = afterMatch.match(/^[\s]*([^\w\s])/)
      return punctuationMatch ? punctuationMatch[1] : undefined
    }
    occurrenceIndex++
  }

  return undefined
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Segment words into optimal chunks for language learning
 * Uses a scoring system to find the best break points
 */
function segmentWords(
  words: WordWithMetadata[]
): Array<{ words: WordWithMetadata[] }> {
  if (words.length === 0) {
    return []
  }

  const segments: Array<{ words: WordWithMetadata[] }> = []
  let currentSegment: WordWithMetadata[] = []
  let currentWordCount = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    currentSegment.push(word)
    currentWordCount++

    // Check if we should break here
    const shouldBreak = shouldBreakAtPosition(
      words,
      i,
      currentWordCount
    )

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
        // No good break point found, force break here
        segments.push({ words: [...currentSegment] })
        currentSegment = []
        currentWordCount = 0
      }
    }
  }

  // Add remaining words as final segment
  if (currentSegment.length > 0) {
    segments.push({ words: currentSegment })
  }

  // Post-process: merge very short segments with adjacent ones if needed
  return mergeShortSegments(segments)
}

/**
 * Determine if we should break at the current position
 */
function shouldBreakAtPosition(
  words: WordWithMetadata[],
  currentIndex: number,
  currentWordCount: number
): boolean {
  if (currentIndex === words.length - 1) {
    // Always break at the end
    return true
  }

  const word = words[currentIndex]

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
  if (word.gapAfter >= SEGMENTATION_CONFIG.longPauseThreshold) {
    breakScore += 8 // Strong pause
  } else if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
    breakScore += 4 // Medium pause
  }

  // Factor 4: Word count (prefer breaking near preferred length)
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    breakScore += 3
  }

  // Factor 5: Avoid breaking too early (unless there's a very strong signal)
  if (currentWordCount < SEGMENTATION_CONFIG.minWordsPerSegment) {
    // Only break if there's a very strong signal:
    // - Sentence end (isSentenceEnd = true, score +12)
    // - Long pause (8+)
    // - Combined strong signals (score >= 10)
    if (breakScore < 10) {
      return false
    }
  }

  // Break if score is high enough
  // Sentence endings (weight 12+) always break
  // Long pauses (8+) usually break
  // Other factors contribute to the decision
  return breakScore >= 6
}

/**
 * Find the best break point within a segment that's too long
 * Looks for punctuation or pauses in the last few words
 * Avoids breaking at abbreviations
 */
function findBestBreakPointInSegment(
  segment: WordWithMetadata[]
): number {
  // Look at the last few words for a good break point
  const lookback = Math.min(5, segment.length - 1)
  const startIndex = Math.max(0, segment.length - lookback - 1)

  let bestIndex = -1
  let bestScore = 0

  for (let i = startIndex; i < segment.length - 1; i++) {
    const word = segment[i]

    // Skip abbreviations - don't break after them
    if (word.isAbbreviation) {
      continue
    }

    let score = 0

    // Prefer sentence-ending punctuation breaks
    if (word.isSentenceEnd) {
      score += 15 // Very strong preference
    } else if (word.punctuationWeight > 0) {
      score += word.punctuationWeight * 2
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

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex >= 0 ? bestIndex : segment.length - 1
}

/**
 * Merge very short segments with adjacent ones
 * Only merges if it doesn't make the result too long
 * Preserves single-word sentences with strong punctuation (e.g., "Why?")
 */
function mergeShortSegments(
  segments: Array<{ words: WordWithMetadata[] }>
): Array<{ words: WordWithMetadata[] }> {
  if (segments.length <= 1) {
    return segments
  }

  const merged: Array<{ words: WordWithMetadata[] }> = []
  let i = 0

  while (i < segments.length) {
    const current = segments[i]
    const lastWord = current.words[current.words.length - 1]

    // Don't merge single-word sentences with sentence-ending punctuation
    // Examples: "Why?", "Yes!", "No." - these should stay separate
    const isSingleWordSentence = current.words.length === 1 && lastWord.isSentenceEnd

    // If segment is too short and not a single-word sentence, try to merge with next
    if (
      !isSingleWordSentence &&
      current.words.length < SEGMENTATION_CONFIG.minWordsPerSegment &&
      i < segments.length - 1
    ) {
      const next = segments[i + 1]
      const combinedLength = current.words.length + next.words.length

      // Merge if combined length is acceptable
      if (combinedLength <= SEGMENTATION_CONFIG.maxWordsPerSegment) {
        merged.push({
          words: [...current.words, ...next.words],
        })
        i += 2 // Skip both segments
        continue
      }
    }

    // Keep segment as is
    merged.push(current)
    i++
  }

  return merged
}

