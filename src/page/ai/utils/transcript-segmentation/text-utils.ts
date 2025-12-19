/**
 * Text Processing Utilities
 *
 * Helper functions for text manipulation, position finding, and punctuation extraction.
 */

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get the position of a word in the text
 * Returns the start index of the word in the text
 *
 * @param text - The full text
 * @param word - The word to find
 * @param wordIndex - The occurrence index (0-based, for handling duplicate words)
 * @returns The start index of the word, or undefined if not found
 */
export function getWordPositionInText(
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
 *
 * @param text - The full text
 * @param word - The word to find
 * @param wordIndex - The occurrence index (0-based)
 * @returns The punctuation mark(s) after the word, or undefined if none
 */
export function extractPunctuationAfterWord(
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
 * Check if a word is an abbreviation based on common abbreviation list
 * Handles both cases: word ending with period (e.g., "Mr.") or word followed by period (e.g., "Mr" + ".")
 *
 * @param word - The word to check (without trailing punctuation)
 * @param punctuationAfter - Optional punctuation after the word
 * @param abbreviations - Set of known abbreviations (case-insensitive)
 * @returns True if the word is an abbreviation
 */
export function isAbbreviationWord(
  word: string,
  punctuationAfter: string | undefined,
  abbreviations: Set<string>
): boolean {
  // Check if word itself ends with period or is followed by period
  const hasPeriod = word.endsWith('.') || punctuationAfter === '.'

  if (!hasPeriod) {
    return false
  }

  // Remove trailing period(s) and check against abbreviation list
  const wordWithoutPeriod = word.replace(/\.+$/, '').toLowerCase()
  return abbreviations.has(wordWithoutPeriod)
}

