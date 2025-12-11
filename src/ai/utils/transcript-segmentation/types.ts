/**
 * Type Definitions for Transcript Segmentation
 *
 * Defines all types used in the transcript segmentation system.
 */

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
 * Word with timing and metadata for segmentation
 */
export interface WordWithMetadata {
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
  isInEntity?: boolean // true if this word is inside an entity (person, place, organization)
  isInMeaningGroup?: boolean // true if this word is inside a meaning group (意群)
  isAtMeaningGroupBoundary?: boolean // true if position after this word is at a meaning group boundary
}

/**
 * A segment of words grouped together for display
 */
export interface WordSegment {
  words: WordWithMetadata[]
}

