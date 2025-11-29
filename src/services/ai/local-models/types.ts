/**
 * Local Model Result Types
 */

export interface LocalASRResult {
  text: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
  language?: string
}

export interface LocalTranslationResult {
  translatedText: string
  sourceLanguage?: string
  targetLanguage?: string
}

export interface LocalDictionaryResult {
  word: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    translation: string
  }>
  contextualExplanation?: string
}

export interface LocalTTSResult {
  audioBlob: Blob
  format: string
  duration?: number
}

