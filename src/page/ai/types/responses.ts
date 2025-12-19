/**
 * AI Service Response Type Definitions
 * Response types for each AI service
 */

/**
 * Translation Response (Basic translation - Enjoy AI free)
 */
export interface TranslationResponse {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

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
  timeline?: Array<{
    text: string
    start: number
    duration: number
    timeline?: any[]
  }>
  language?: string
  duration?: number
}

/**
 * TTS Transcript Item with timing information
 * Matches TranscriptLine format from db schema for consistency
 * Timeline uses milliseconds (integer) for precision
 *
 * Structure: Sentence -> Word (nested via timeline)
 */
export interface TTSTranscriptItem {
  text: string
  start: number // milliseconds
  duration: number // milliseconds
  timeline?: TTSTranscriptItem[] // nested: Sentence → Word
  confidence?: number // 0-1
}

/**
 * TTS Transcript with sentence-level timestamps and nested word timeline
 * Follows db schema TranscriptLine format
 */
export interface TTSTranscript {
  /**
   * Sentence-level items with optional word-level timeline
   * Each item has: text, start (ms), duration (ms), timeline (words)
   */
  timeline: TTSTranscriptItem[]
}

/**
 * TTS (Text-to-Speech) Response
 */
export interface TTSResponse {
  audioUrl?: string
  audioBlob?: Blob
  duration?: number
  format?: string
  /**
   * Word-level transcript with timestamps
   * Generated alongside audio for synchronization purposes
   */
  transcript?: TTSTranscript
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

