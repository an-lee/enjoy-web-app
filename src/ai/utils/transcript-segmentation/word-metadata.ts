/**
 * Word Metadata Generation
 *
 * Functions to enrich raw word timings with metadata needed for segmentation,
 * including punctuation, abbreviation detection, sentence boundaries, and semantic information.
 */

import type { WordWithMetadata, RawWordTiming } from './types'
import type { EntityPosition, MeaningGroupBoundary } from '../compromise-helper'
import {
  isPositionInEntity,
  isPositionInMeaningGroup,
  isMeaningGroupBoundary,
} from '../compromise-helper'
import { SEGMENTATION_CONFIG, COMMON_ABBREVIATIONS } from './constants'
import { getWordPositionInText, extractPunctuationAfterWord, isAbbreviationWord } from './text-utils'
import { isSentenceBoundary } from '../multilingual-segmenter'
import { detectAbbreviationsEnhanced } from '../compromise-helper'

/**
 * Convert raw word timings to words with enriched metadata
 *
 * @param text - Original text that was synthesized
 * @param rawTimings - Word-level timing data from TTS provider (times in seconds)
 * @param language - Optional language code for better segmentation
 * @param entities - Detected entities (people, places, organizations) - used for English only
 * @param meaningGroups - Detected meaning group boundaries - used for English only
 * @returns Array of words with enriched metadata
 */
export function enrichWordMetadata(
  text: string,
  rawTimings: RawWordTiming[],
  language: string | undefined,
  entities: EntityPosition[],
  meaningGroups: MeaningGroupBoundary[]
): WordWithMetadata[] {
  const isEnglish = language?.startsWith('en') ?? false

  return rawTimings.map((raw, index) => {
    const start = Math.round(raw.startTime * 1000)
    const end = Math.round(raw.endTime * 1000)
    const duration = end - start

    // Calculate gap after this word
    const gapAfter =
      index < rawTimings.length - 1
        ? Math.round(rawTimings[index + 1].startTime * 1000) - end
        : 0

    // Extract punctuation after this word from the original text
    const wordText = raw.text.trim()
    // Clean word for position finding (remove trailing punctuation)
    const cleanWordText = wordText.replace(/[.,!?;:，。！？；：]+$/, '')

    // Use cleaned word to find position and punctuation
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
      isAbbreviation = isAbbreviationWord(cleanWordText, punctuationAfter, COMMON_ABBREVIATIONS)
    }

    // Check if this word is part of an entity (person, place, organization)
    const isInEntity =
      wordPosition !== undefined && isPositionInEntity(wordPosition, entities)

    // Check if this word is part of a meaning group (意群)
    const isInMeaningGroup =
      wordPosition !== undefined && isPositionInMeaningGroup(wordPosition, meaningGroups)

    // Check if position after this word is at a meaning group boundary
    const isAtMeaningGroupBoundary =
      wordPosition !== undefined &&
      isMeaningGroupBoundary(wordPosition + cleanWordText.length, meaningGroups)

    // Check if this word is a number (contains digits and is primarily numeric)
    const cleanedWord = cleanWordText.replace(/[^\d.,]/g, '')
    const isNumber =
      cleanedWord.length > 0 &&
      /^\d+([.,]\d+)*$/.test(cleanedWord) &&
      cleanedWord.length >= cleanWordText.length * 0.5 // At least 50% digits

    // Determine if punctuation indicates sentence end (not abbreviation or number)
    let isSentenceEnd = false
    if (punctuationAfter !== undefined && !isAbbreviation && !isNumber) {
      const isSentenceEndingPunctuation =
        punctuationAfter === '.' ||
        punctuationAfter === '!' ||
        punctuationAfter === '?' ||
        punctuationAfter === '。' ||
        punctuationAfter === '！' ||
        punctuationAfter === '？'

      if (isSentenceEndingPunctuation) {
        // Use Intl.Segmenter if available for more accurate detection
        if (wordPosition !== undefined && language) {
          const endPosition = wordPosition + cleanWordText.length + (punctuationAfter ? 1 : 0)
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
        punctuationWeight =
          SEGMENTATION_CONFIG.punctuationWeights[
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
}

