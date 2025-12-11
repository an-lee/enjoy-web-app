/**
 * Constants for Transcript Segmentation
 *
 * Defines configuration values, word lists, and punctuation weights
 * used throughout the segmentation algorithm.
 */

/**
 * Common abbreviations that end with a period but should not cause sentence breaks
 * These are case-insensitive
 */
export const COMMON_ABBREVIATIONS = new Set([
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
export const NO_BREAK_WORDS = new Set([
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
export const SEGMENTATION_CONFIG = {
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

