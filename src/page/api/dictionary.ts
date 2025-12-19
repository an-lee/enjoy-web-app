/**
 * Dictionary API Service
 * Free service provided by Enjoy API
 *
 * Note: This is a regular API service, not an AI service.
 * It's always free and doesn't require AI configuration.
 * For contextual explanations with AI, use the AI dictionary service.
 */

import { apiClient } from '@/page/api/client'

export interface DictionaryBasicRequest {
  word: string
  sourceLanguage: string
  targetLanguage: string
}

export interface DictionaryBasicResponse {
  word: string
  definitions: Array<{
    partOfSpeech: string
    translation: string
    examples?: string[]
  }>
  sourceLanguage: string
  targetLanguage: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Dictionary Basic API Service
 * Simple word lookup without AI
 * Free service - no configuration needed
 */
export const dictionaryApi = {
  /**
   * Basic word lookup (FREE)
   * Always uses Enjoy API - no AI needed
   * Provides: definitions, translations, part of speech
   */
  async lookupBasic(
    request: DictionaryBasicRequest
  ): Promise<ApiResponse<DictionaryBasicResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<DictionaryBasicResponse>>(
        '/api/v1/services/dictionary/basic',
        {
          word: request.word,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
        }
      )

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DICTIONARY_BASIC_ERROR',
          message: error.message || 'Basic dictionary lookup failed',
        },
      }
    }
  },
}

