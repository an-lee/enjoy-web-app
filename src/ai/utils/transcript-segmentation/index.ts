/**
 * Transcript Segmentation Module
 *
 * Intelligently segments text-to-speech transcripts for language learning.
 * Optimized for follow-along reading practice by considering:
 * - Audio pauses (breathing points)
 * - Punctuation marks
 * - Word count (optimal segment length)
 * - Abbreviations and numbers (avoid false breaks)
 * - Meaning groups (意群) for semantic coherence
 * - Sentence boundaries (multilingual support)
 *
 * This module can be used by any TTS provider that generates word-level timestamps.
 *
 * ## Architecture
 *
 * The segmentation process consists of several stages:
 *
 * 1. **Metadata Enrichment** (`word-metadata.ts`):
 *    - Converts raw word timings to milliseconds
 *    - Detects punctuation, abbreviations, numbers
 *    - Identifies sentence boundaries
 *    - Detects entities and meaning groups (English only, using Compromise.js)
 *
 * 2. **Segmentation** (`segmentation.ts`):
 *    - Iterates through words and uses break detection to determine segment boundaries
 *    - Handles force-break scenarios when segments get too long
 *
 * 3. **Break Detection** (`break-detection.ts`):
 *    - Calculates break scores based on multiple factors
 *    - Considers punctuation, pauses, meaning groups, and semantic coherence
 *    - Implements priority-based break decisions
 *
 * 4. **Segment Merging** (`merge-segments.ts`):
 *    - Post-processes segments to merge very short ones
 *    - Respects audio pauses and punctuation boundaries
 *
 * ## Usage
 *
 * ```typescript
 * import { convertToTranscriptFormat } from '@/ai/utils/transcript-segmentation'
 *
 * const transcript = convertToTranscriptFormat(
 *   "Hello world. How are you?",
 *   [
 *     { text: "Hello", startTime: 0.0, endTime: 0.5 },
 *     { text: "world", startTime: 0.6, endTime: 1.0 },
 *     // ...
 *   ],
 *   "en"
 * )
 * ```
 *
 * ## Configuration
 *
 * Segmentation behavior can be tuned via constants in `constants.ts`:
 * - `minWordsPerSegment`: Minimum words in a segment (default: 1)
 * - `maxWordsPerSegment`: Maximum words in a segment (default: 12)
 * - `preferredWordsPerSegment`: Preferred word count (default: 6)
 * - `pauseThreshold`: Minimum gap to consider a pause in ms (default: 250)
 * - `longPauseThreshold`: Longer pause threshold in ms (default: 500)
 *
 * @module transcript-segmentation
 */

import type { TTSTranscript } from '../../types'
import type { RawWordTiming } from './types'
import { enrichWordMetadata } from './word-metadata'
import { segmentWords } from './segmentation'
import { mergeShortSegments } from './merge-segments'
import {
  detectEntitiesWithCompromise,
  detectMeaningGroups,
  type EntityPosition,
  type MeaningGroupBoundary,
} from '../compromise-helper'

/**
 * Convert raw word timings to TranscriptLine format
 * Intelligently segments text based on:
 * - Audio pauses (breathing points)
 * - Punctuation marks
 * - Word count (optimal for follow-along reading)
 * - Multilingual sentence boundaries (using Intl.Segmenter when available)
 * - Meaning groups (意群) for semantic coherence (English only)
 *
 * All times are converted to milliseconds (integer)
 *
 * @param text - Original text that was synthesized
 * @param rawTimings - Word-level timing data from TTS provider (times in seconds)
 * @param language - Optional language code (e.g., 'en', 'zh', 'ja') for better segmentation
 * @returns Transcript with intelligently segmented timeline
 *
 * @example
 * ```typescript
 * const transcript = convertToTranscriptFormat(
 *   "Hello world. How are you?",
 *   [
 *     { text: "Hello", startTime: 0.0, endTime: 0.5 },
 *     { text: "world", startTime: 0.6, endTime: 1.0 },
 *     { text: "How", startTime: 1.2, endTime: 1.4 },
 *     { text: "are", startTime: 1.5, endTime: 1.7 },
 *     { text: "you", startTime: 1.8, endTime: 2.0 },
 *   ],
 *   "en"
 * )
 * // Result: Segmented into two segments: ["Hello world.", "How are you?"]
 * ```
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

  // Step 1: Enrich words with metadata
  const words = enrichWordMetadata(text, rawTimings, language, entities, meaningGroups)

  // Step 2: Segment words into optimal chunks
  let segments = segmentWords(words)

  // Step 3: Post-process: merge very short segments
  segments = mergeShortSegments(segments)

  // Step 4: Convert segments to TTSTranscriptItem format
  const timeline = segments.map((segment) => {
    const wordTimeline = segment.words.map((w) => ({
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

// Re-export types and constants for external use
export type { RawWordTiming, WordWithMetadata, WordSegment } from './types'
export { SEGMENTATION_CONFIG, COMMON_ABBREVIATIONS, NO_BREAK_WORDS } from './constants'

