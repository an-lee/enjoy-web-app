/**
 * AI Service Response Type Definitions
 * Response types for each AI service
 */

/**
 * Smart Translation Response
 */
export interface SmartTranslationResponse {
  translatedText: string
  aiModel: string
  tokensUsed?: number
}

/**
 * Fast Translation Response
 * Note: Fast Translation is a regular API service (not AI service)
 */
export interface FastTranslationResponse {
  translatedText: string
  aiModel: string
  tokensUsed?: number
}

/**
 * Dictionary Response
 */
export interface DictionaryResponse {
  word: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    translation: string
    example?: string
  }>
  contextualExplanation?: string
  etymology?: string
}

/**
 * ASR (Speech-to-Text) Response
 */
export interface ASRResponse {
  text: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
  language?: string
  duration?: number
}

/**
 * TTS (Text-to-Speech) Response
 */
export interface TTSResponse {
  audioUrl?: string
  audioBlob?: Blob
  duration?: number
  format?: string
}

/**
 * Pronunciation Assessment Response
 */
export interface AssessmentResponse {
  overallScore: number
  accuracyScore: number
  fluencyScore: number
  prosodyScore: number
  wordResults?: Array<{
    word: string
    accuracyScore: number
    errorType: string
  }>
}

