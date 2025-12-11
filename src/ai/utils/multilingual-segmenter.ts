/**
 * Multilingual Sentence Segmenter
 *
 * Uses browser-native Intl.Segmenter API for intelligent sentence segmentation
 * Falls back to punctuation-based segmentation for older browsers
 *
 * Supports: en, zh, ja, ko, es, fr, de, pt and more
 */

/**
 * Check if browser supports Intl.Segmenter
 */
export function supportsIntlSegmenter(): boolean {
  return (
    typeof Intl !== 'undefined' &&
    'Segmenter' in Intl &&
    typeof Intl.Segmenter === 'function'
  )
}

/**
 * Language code mapping for Intl.Segmenter
 * Maps application language codes to BCP 47 tags
 */
const LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  zh: 'zh',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
}

/**
 * Normalize language code to BCP 47 format for Intl.Segmenter
 */
function normalizeLanguage(language?: string): string {
  if (!language) {
    return 'en' // Default to English
  }

  // Use mapping if available, otherwise use as-is
  return LANGUAGE_MAP[language] || language.split('-')[0] || 'en'
}

/**
 * Sentence boundary positions using Intl.Segmenter
 * Returns array of indices where sentences end (exclusive)
 */
function getSentenceBoundariesWithIntl(
  text: string,
  language: string
): number[] {
  try {
    const normalizedLang = normalizeLanguage(language)
    const segmenter = new Intl.Segmenter(normalizedLang, {
      granularity: 'sentence',
    })

    const boundaries: number[] = []
    const segments = Array.from(segmenter.segment(text))

    for (const segment of segments) {
      // segment.index is the start, segment.index + segment.segment.length is the end
      const endIndex = segment.index + segment.segment.length
      if (endIndex > 0 && endIndex <= text.length) {
        boundaries.push(endIndex)
      }
    }

    return boundaries
  } catch (error) {
    console.warn('Intl.Segmenter failed, using fallback:', error)
    return []
  }
}

/**
 * Fallback: Sentence boundary detection based on punctuation
 * Language-aware punctuation rules
 */
function getSentenceBoundariesWithPunctuation(
  text: string,
  language: string
): number[] {
  // Language-specific sentence ending patterns
  const sentenceEndings: Record<string, RegExp> = {
    en: /[.!?]+/g,
    zh: /[。！？…]+/g,
    ja: /[。！？]+/g,
    ko: /[.!?。！？]+/g,
    es: /[.!?]+/g,
    fr: /[.!?]+/g,
    de: /[.!?]+/g,
    pt: /[.!?]+/g,
  }

  const normalizedLang = normalizeLanguage(language)
  const regex = sentenceEndings[normalizedLang] || sentenceEndings.en

  const boundaries: number[] = []
  let lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const endIndex = match.index + match[0].length
    boundaries.push(endIndex)
    lastIndex = endIndex
  }

  // Always include the end of text if not already included
  if (lastIndex < text.length) {
    boundaries.push(text.length)
  }

  return boundaries
}

/**
 * Get sentence boundaries for a text
 * Uses Intl.Segmenter if available, falls back to punctuation-based detection
 *
 * @param text - Text to segment
 * @param language - Language code (e.g., 'en', 'zh', 'ja')
 * @returns Array of sentence end positions (exclusive indices)
 */
export function getSentenceBoundaries(
  text: string,
  language?: string
): number[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // Try Intl.Segmenter first
  if (supportsIntlSegmenter()) {
    const boundaries = getSentenceBoundariesWithIntl(text, language || 'en')
    if (boundaries.length > 0) {
      return boundaries
    }
  }

  // Fallback to punctuation-based detection
  return getSentenceBoundariesWithPunctuation(text, language || 'en')
}

/**
 * Split text into sentences
 *
 * @param text - Text to split
 * @param language - Language code (e.g., 'en', 'zh', 'ja')
 * @returns Array of sentences
 */
export function segmentSentences(
  text: string,
  language?: string
): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const boundaries = getSentenceBoundaries(text, language)

  if (boundaries.length === 0) {
    return [text.trim()].filter(s => s.length > 0)
  }

  const sentences: string[] = []
  let startIndex = 0

  for (const endIndex of boundaries) {
    const sentence = text.substring(startIndex, endIndex).trim()
    if (sentence.length > 0) {
      sentences.push(sentence)
    }
    startIndex = endIndex
  }

  // Handle any remaining text
  if (startIndex < text.length) {
    const remaining = text.substring(startIndex).trim()
    if (remaining.length > 0) {
      sentences.push(remaining)
    }
  }

  return sentences
}

/**
 * Check if a position in text is at a sentence boundary
 *
 * @param text - Full text
 * @param position - Character position to check
 * @param language - Language code
 * @returns True if position is at a sentence boundary
 */
export function isSentenceBoundary(
  text: string,
  position: number,
  language?: string
): boolean {
  const boundaries = getSentenceBoundaries(text, language)
  return boundaries.includes(position)
}

