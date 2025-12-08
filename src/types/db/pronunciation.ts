/**
 * Pronunciation assessment types
 */

// ============================================================================
// Pronunciation Assessment Types
// ============================================================================

export interface PronunciationAssessmentResult {
  accuracyScore?: number
  fluencyScore?: number
  completenessScore?: number
  prosodyScore?: number
  words?: PronunciationWordResult[]
}

export interface PronunciationWordResult {
  word: string
  accuracyScore?: number
  errorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  syllables?: PronunciationSyllableResult[]
}

export interface PronunciationSyllableResult {
  syllable: string
  accuracyScore?: number
}

