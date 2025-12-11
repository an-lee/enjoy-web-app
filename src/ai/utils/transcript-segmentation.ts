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
import {
  detectAbbreviationsEnhanced,
  detectEntitiesWithCompromise,
  isPositionInEntity,
  type EntityPosition,
  detectMeaningGroups,
  isMeaningGroupBoundary,
  isPositionInMeaningGroup,
  type MeaningGroupBoundary,
} from './compromise-helper'

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
 * Words that should NOT be break points (e.g., articles, prepositions)
 * These should bridge segments even if there's a pause
 */
const NO_BREAK_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Prepositions (short ones that attach to following noun)
  'of', 'to', 'in', 'on', 'at', 'for', 'by', 'with', 'from', 'about',
  // Possessives
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  // Conjunctions (that usually link close items)
  'and', 'or', 'nor'
])

/**
 * Configuration for transcript segmentation
 * Optimized for language learning follow-along reading
 */
const SEGMENTATION_CONFIG = {
  // Word count limits per segment (for readability)
  minWordsPerSegment: 1, // Minimum words in a segment (can be overridden for strong breaks)
  maxWordsPerSegment: 12, // Maximum words in a segment (ideal for follow-along)
  preferredWordsPerSegment: 6, // Preferred word count for optimal learning

  // Pause detection (in milliseconds)
  // Detects natural breathing points in speech
  pauseThreshold: 250, // Minimum gap between words to consider a pause
  longPauseThreshold: 500, // Longer pause indicating a stronger break

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
  isInMeaningGroup?: boolean // true if this word is inside a meaning group (意群)
  isAtMeaningGroupBoundary?: boolean // true if position after this word is at a meaning group boundary
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

  // For English text, use Compromise to enhance detection
  const isEnglish = language?.startsWith('en') ?? false
  let entities: EntityPosition[] = []
  let meaningGroups: MeaningGroupBoundary[] = []

  if (isEnglish) {
    try {
      entities = detectEntitiesWithCompromise(text)
    } catch (error) {
      // If Compromise fails, continue without entity detection
      console.warn('Compromise entity detection failed, continuing without it:', error)
    }

    try {
      meaningGroups = detectMeaningGroups(text)
    } catch (error) {
      // If Compromise fails, continue without meaning group detection
      console.warn('Compromise meaning group detection failed, continuing without it:', error)
    }
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
    // Clean word for position finding (remove trailing punctuation)
    const cleanWordText = wordText.replace(/[.,!?;:，。！？；：]+$/, '')

    // Use cleaned word to find position and punctuation
    // This ensures words like "saying," (in raw data) are matched correctly as "saying"
    let punctuationAfter = extractPunctuationAfterWord(text, cleanWordText, index)

    // If we couldn't find punctuation in text, check if the word itself has it
    if (!punctuationAfter) {
      const punctMatch = wordText.match(/[.,!?;:，。！？；：]+$/)
      if (punctMatch) {
        punctuationAfter = punctMatch[0]
      }
    }

    // Get word position in text for sentence boundary detection
    const wordPosition = getWordPositionInText(text, cleanWordText, index)

    // Check if this is an abbreviation
    // For English, use enhanced detection with Compromise
    let isAbbreviation = false
    if (isEnglish && wordPosition !== undefined) {
      // Use Compromise-enhanced detection for English
      isAbbreviation = detectAbbreviationsEnhanced(
        text,
        cleanWordText,
        COMMON_ABBREVIATIONS
      )
    } else {
      // Use manual detection for other languages
      isAbbreviation = isAbbreviationWord(cleanWordText, punctuationAfter)
    }

    // Check if this word is part of an entity (person, place, organization)
    // Avoid breaking in the middle of entity names
    // Note: This information is used in segmentWords function
    const isInEntity = wordPosition !== undefined &&
      isPositionInEntity(wordPosition, entities)

    // Check if this word is part of a meaning group (意群)
    // Avoid breaking in the middle of meaning groups
    const isInMeaningGroup = wordPosition !== undefined &&
      isPositionInMeaningGroup(wordPosition, meaningGroups)

    // Check if position after this word is at a meaning group boundary
    const isAtMeaningGroupBoundary = wordPosition !== undefined &&
      isMeaningGroupBoundary(wordPosition + cleanWordText.length, meaningGroups)

    // Check if this word is a number (contains digits and is primarily numeric)
    // Examples: "3.14", "2024", "1,000" but not "3rd", "1st", "2nd"
    const cleanedWord = cleanWordText.replace(/[^\d.,]/g, '')
    const isNumber = cleanedWord.length > 0 && /^\d+([.,]\d+)*$/.test(cleanedWord) &&
                     cleanedWord.length >= cleanWordText.length * 0.5 // At least 50% digits

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
          const endPosition = wordPosition + cleanWordText.length + (punctuationAfter ? 1 : 0)
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
      isInEntity,
      isInMeaningGroup,
      isAtMeaningGroupBoundary,
    }
  })

  // Segment words into optimal chunks for follow-along reading
  // Meaning group information is already stored in word metadata
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
 * Considers meaning groups (意群) to avoid breaking semantic units
 * Meaning group information is already stored in word.isInMeaningGroup and word.isAtMeaningGroupBoundary
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

    // console.log(`Word: ${word.text}, Gap: ${word.gapAfter}, ShouldBreak: ${shouldBreak}`)

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
        // This ensures we don't create overly long segments
        // Look backwards from the end to find a good break point
        let foundBreak = false
        for (let j = currentSegment.length - 1; j >= SEGMENTATION_CONFIG.preferredWordsPerSegment; j--) {
          const checkWord = currentSegment[j]
          // Check if this position has any break signal
          if (checkWord.isAtMeaningGroupBoundary ||
              checkWord.punctuationWeight > 0 ||
              checkWord.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
            // Found a good break point
            const firstPart = currentSegment.slice(0, j + 1)
            const secondPart = currentSegment.slice(j + 1)

            segments.push({ words: firstPart })
            currentSegment = secondPart
            currentWordCount = secondPart.length
            foundBreak = true
            break
          }
        }

        if (!foundBreak) {
          // If still no break point, break at preferredWordsPerSegment
          if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment + 3) {
            const breakAt = SEGMENTATION_CONFIG.preferredWordsPerSegment
            const firstPart = currentSegment.slice(0, breakAt)
            const secondPart = currentSegment.slice(breakAt)

            segments.push({ words: firstPart })
            currentSegment = secondPart
            currentWordCount = secondPart.length
          } else {
            // Force break here if segment is at max length
            segments.push({ words: [...currentSegment] })
            currentSegment = []
            currentWordCount = 0
          }
        }
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
 * Considers meaning groups (意群) to avoid breaking semantic units
 * Meaning group information is already stored in word.isInMeaningGroup and word.isAtMeaningGroupBoundary
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
  // We assume any gap > threshold is a deliberate pause by the speaker/TTS
  if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
    // Exception: Don't break after "bad break words" (articles, prepositions)
    // unless the pause is VERY long (> longPauseThreshold)
    // This heals "hiccups" in TTS or natural speech where a speaker pauses after "the..."
    const textLower = word.text.toLowerCase().trim()
    if (NO_BREAK_WORDS.has(textLower)) {
      if (word.gapAfter < SEGMENTATION_CONFIG.longPauseThreshold) {
        // Ignore this pause, it's likely a hesitation after a function word
        // e.g., "destroy a [pause] generation" -> Keep "destroy a generation"
        // Don't add to breakScore
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
  // Only add score if we have enough words AND there's some break signal
  // This prevents breaking just because we have enough words
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    // Only add score if there's at least some signal (punctuation, pause, or meaning group)
    const hasAnySignal = word.punctuationWeight > 0 ||
                        word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold ||
                        word.isAtMeaningGroupBoundary ||
                        word.isSentenceEnd
    if (hasAnySignal) {
      breakScore += 3
    }
    // Also add score if we're significantly over preferred length (encourage breaking)
    if (currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment - 2) {
      breakScore += 2 // Additional encouragement to break when approaching max
    }
  }

  // Factor 5: Meaning group boundaries (意群边界)
  // Prefer breaking at meaning group boundaries for better semantic coherence
  if (word.isAtMeaningGroupBoundary) {
    breakScore += 5 // Strong preference for breaking at meaning group boundaries
  } else if (word.isInMeaningGroup) {
    // Penalize breaking inside meaning groups (unless there's a very strong signal)
    breakScore -= 3
  }

  // Factor 6: Avoid breaking too early (unless there's a very strong signal)
  if (currentWordCount < SEGMENTATION_CONFIG.minWordsPerSegment) {
    // Only break if there's a very strong signal:
    // - Sentence end (isSentenceEnd = true, score +12)
    // - Long pause (8+)
    // - Meaning group boundary (5+)
    // - Combined strong signals (score >= 10)
    if (breakScore < 10) {
      return false
    }
  }

  // Factor 7: Prefer accumulating words when there's no strong break signal
  // BUT: Always allow breaking at meaning group boundaries if we have enough words
  // This is critical for semantic coherence

  // PRIORITY 1: If we're at a meaning group boundary and have enough words, BREAK
  // This should happen regardless of other factors
  if (word.isAtMeaningGroupBoundary && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    // Always break at meaning group boundaries if we have at least minWordsPerSegment
    // This ensures semantic units are respected
    return true
  }

  // PRIORITY 1.5: Heuristic - Break before clause-starting words
  // This creates natural breaks at semantic boundaries even with fewer words
  if (currentIndex < words.length - 1 && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    const nextWord = words[currentIndex + 1]
    const nextWordText = nextWord.text.toLowerCase()

    // Break before relative pronouns (who, which, that, whom, whose)
    // Example: "psychologist" -> "who" (creates break after "As a social psychologist")
    if (['who', 'which', 'that', 'whom', 'whose'].includes(nextWordText)) {
      // Only break if we have at least minWordsPerSegment words
      // This prevents breaking too early
      return true
    }

    // Break before question words that start object clauses (what, how, why, when, where)
    // Example: "out" -> "what" (creates break after "to figure out")
    // But require more words to avoid breaking too early
    if (['what', 'how', 'why', 'when', 'where'].includes(nextWordText) &&
        currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment + 1) {
      return true
    }

    // Break before main clause starters (I, you, he, she, it, we, they) if current word ends with comma
    // Example: "Z," -> "I" (creates break after "what unearth was happening to Gen Z,")
    const mainClauseStarters = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those']
    if (mainClauseStarters.includes(nextWordText)) {
      // Check if current word ends with comma (either in punctuationAfter or in word text)
      const currentWordHasComma = word.punctuationAfter === ',' || word.punctuationAfter === '，' ||
                                  word.text.endsWith(',') || word.text.endsWith('，')
      if (currentWordHasComma && currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
        return true
      }
    }
  }

  // PRIORITY 2: If we have >= preferredWordsPerSegment words, be aggressive about breaking
  // This prevents segments from growing too long
  if (currentWordCount >= SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    // Break if we have ANY signal (punctuation, pause, or meaning group boundary)
    // This ensures we don't wait until maxWordsPerSegment to break
    const isPause = word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold
    const isBadBreakWord = NO_BREAK_WORDS.has(word.text.toLowerCase().trim())

    // Don't break on pause if it's a bad break word (unless very long pause)
    const validPause = isPause && (!isBadBreakWord || word.gapAfter >= SEGMENTATION_CONFIG.longPauseThreshold)

    if (word.punctuationWeight > 0 ||
        validPause ||
        word.isAtMeaningGroupBoundary ||
        breakScore >= 5) {
      return true
    }

    // Even without strong signals, if we're getting close to max, break
    if (currentWordCount >= SEGMENTATION_CONFIG.maxWordsPerSegment - 3) {
      // Force break to prevent overly long segments
      // Prefer breaking at any punctuation or meaning group boundary
      if (word.punctuationWeight > 0 || word.isAtMeaningGroupBoundary || breakScore >= 3) {
        return true
      }
    }
  }

  // PRIORITY 3: If we have fewer words, only break with strong signals
  if (currentWordCount < SEGMENTATION_CONFIG.preferredWordsPerSegment) {
    // If there's no punctuation, no pause, and no meaning group boundary,
    // we should accumulate more words before breaking
    const hasWeakSignals = word.punctuationWeight > 0 ||
                          word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold ||
                          word.isAtMeaningGroupBoundary

    if (!hasWeakSignals && breakScore < 8) {
      // Don't break if we have weak signals and low score
      // Wait until we have more words or stronger signals
      return false
    }
  }

  // Break if score is high enough
  // Sentence endings (weight 12+) always break
  // Long pauses (8+) usually break
  // Meaning group boundaries (5+) with enough words should break
  // Other factors contribute to the decision
  // Increased threshold to prevent over-segmentation when words have minimal gaps
  // Require at least 8 points OR a combination of signals
  if (breakScore >= 8) {
    return true
  }

  // Special case: Meaning group boundary with enough words
  // This is important for semantic coherence even if other signals are weak
  // Already handled in Factor 7 above, but keep this as a fallback
  if (word.isAtMeaningGroupBoundary &&
      currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    // Always break at meaning group boundaries if we have enough words
    // Don't require breakScore >= 5, as meaning group boundary itself is a strong signal
    return true
  }

  // Special case: If we have a comma or semicolon, break if we have enough words
  // Comma/semicolon indicates a clause boundary, which is a good break point
  // Even without a pause, we should break at commas if we have enough words
  // Check both punctuationAfter and if word itself ends with comma
  const hasComma = word.punctuationAfter === ',' || word.punctuationAfter === '，' ||
                   word.text.endsWith(',') || word.text.endsWith('，')
  const hasSemicolon = word.punctuationAfter === ';' || word.punctuationAfter === '；' ||
                       word.text.endsWith(';') || word.text.endsWith('；')

  if ((hasComma || hasSemicolon) &&
      currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment) {
    // If there's a pause, definitely break
    if (word.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      return true
    }

    // Check if next word starts a new main clause (pronouns like I, you, he, she, it, we, they)
    // This helps break at "Z, I was stunned" -> "Z," and "I was stunned"
    if (currentIndex < words.length - 1) {
      const nextWord = words[currentIndex + 1]
      const nextWordText = nextWord.text.toLowerCase()
      const mainClauseStarters = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those']

      if (mainClauseStarters.includes(nextWordText)) {
        // Break at comma before main clause if we have at least minWordsPerSegment words
        // This creates natural breaks like "Z, I" -> break after "Z,"
        // This should happen BEFORE checking other conditions to ensure it takes priority
        return true
      }
    }

    // Even without pause or main clause starter, break if we have enough words (comma indicates clause boundary)
    // Lower threshold to allow breaking at "Z," (which has 7 words from "what" to "Z,")
    if (currentWordCount >= SEGMENTATION_CONFIG.minWordsPerSegment + 2) {
      return true
    }
  }

  // Don't break if score is too low
  return false
}

/**
 * Find the best break point within a segment that's too long
 * Looks for punctuation or pauses in the last few words
 * Avoids breaking at abbreviations, entities, and inside meaning groups
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

    // Skip "bad break words" - don't break after articles/prepositions
    // unless they have strong punctuation (unlikely)
    if (NO_BREAK_WORDS.has(word.text.toLowerCase().trim()) && !word.punctuationWeight) {
      continue
    }

    // Prefer breaking at meaning group boundaries
    // Avoid breaking inside meaning groups
    if (word.isInMeaningGroup && !word.isAtMeaningGroupBoundary) {
      // Skip positions inside meaning groups (unless it's the boundary)
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
      score += 8 // Strong preference for meaning group boundaries
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

    // If this is the last segment, just add it
    if (i === segments.length - 1) {
      merged.push(current)
      break
    }

    const next = segments[i + 1]
    const lastWord = current.words[current.words.length - 1]

    // DECISION: Should we merge [current] + [next]?

    // Special case: Check if we are splitting an abbreviation like "Mr" + "."
    // If the current segment ends with "." and the word before it is a known abbreviation (without period),
    // we should almost certainly merge with the next word (e.g. "Mr" + "." + "Smith")
    if (current.words.length >= 2) {
      const lastWord = current.words[current.words.length - 1]
      const secondLastWord = current.words[current.words.length - 2]
      if (
        lastWord.text === '.' &&
        COMMON_ABBREVIATIONS.has(secondLastWord.text.toLowerCase())
      ) {
        merged.push({
          words: [...current.words, ...next.words],
        })
        i += 2
        continue
      }
    }

    // 1. Check audio gap (Pause)
    // If there is a distinct pause between segments, DO NOT MERGE.
    // We respect the "breathing point" rule strictly.
    if (lastWord.gapAfter >= SEGMENTATION_CONFIG.pauseThreshold) {
      merged.push(current)
      i++
      continue
    }

    // 2. Check Punctuation
    // If current segment ends with distinct punctuation, DO NOT MERGE.
    // e.g. "Hello," + "world" -> Keep separate if there's a comma,
    // unless it's extremely short/fast.
    const hasStrongPunctuation =
      lastWord.isSentenceEnd ||
      (lastWord.punctuationAfter &&
        [',', '，', ';', '；', ':', '：'].includes(lastWord.punctuationAfter))

    if (hasStrongPunctuation) {
      // Only merge if it's really short (1 word) AND the gap is tiny (< 100ms)
      // Otherwise, keep the punctuation break.
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
      // strict limit for merging
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

