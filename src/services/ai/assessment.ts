/**
 * Pronunciation Assessment Service
 * Uses Azure Speech Services for phoneme-level pronunciation scoring
 *
 * Supported providers:
 * - enjoy: Enjoy API provides Azure Speech token (free/quota-based)
 * - byok: User's own Azure Speech subscription key (FUTURE - interface reserved)
 *
 * Note: ONLY Azure Speech supports pronunciation assessment.
 * Frontend uses Azure Speech SDK directly with token or subscription key.
 */

import { apiClient } from '@/services/api/client'
import { azureSpeechService } from './enjoy/azure-speech'
import type { AIServiceConfig, AIServiceResponse } from './types'
import {
  ERROR_ASSESSMENT,
  ERROR_ASSESSMENT_BYOK,
  ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
  SERVICE_TYPES,
  AI_PROVIDERS,
  BYOK_PROVIDERS,
  DEFAULT_AZURE_REGION,
  getErrorMessage,
} from './constants'

export interface AssessmentRequest {
  audioBlob: Blob
  referenceText: string
  language: string
  config?: AIServiceConfig
}

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

/**
 * Pronunciation Assessment Service
 */
export const assessmentService = {
  /**
   * Assess pronunciation
   * Uses Azure Speech Services (only provider that supports pronunciation assessment)
   * Frontend uses Azure Speech SDK with token (enjoy) or subscription key (byok)
   */
  async assess(
    request: AssessmentRequest
  ): Promise<AIServiceResponse<AssessmentResponse>> {
    const useBYOK = request.config?.provider === AI_PROVIDERS.BYOK

    // If using BYOK with Azure, use Azure SDK directly (FUTURE)
    if (useBYOK && request.config?.byok) {
      if (request.config.byok.provider === BYOK_PROVIDERS.AZURE) {
        try {
          const result = await azureSpeechService.assessPronunciationWithKey(
            request.audioBlob,
            request.referenceText,
            request.language,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || DEFAULT_AZURE_REGION,
            }
          )
          return {
            success: true,
            data: result,
            metadata: {
              serviceType: SERVICE_TYPES.ASSESSMENT,
              provider: AI_PROVIDERS.BYOK,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: ERROR_ASSESSMENT_BYOK,
              message: getErrorMessage(ERROR_ASSESSMENT_BYOK, error.message),
            },
            metadata: {
              serviceType: SERVICE_TYPES.ASSESSMENT,
              provider: AI_PROVIDERS.BYOK,
            },
          }
        }
      }

      // Only Azure supports pronunciation assessment
      return {
        success: false,
        error: {
          code: ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
          message: getErrorMessage(
            ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
            request.config.byok.provider
          ),
        },
        metadata: {
          serviceType: SERVICE_TYPES.ASSESSMENT,
          provider: AI_PROVIDERS.BYOK,
        },
      }
    }

    // Use Enjoy API (get token or forward directly)
    try {
      const formData = new FormData()
      formData.append('audio', request.audioBlob, 'recording.wav')
      formData.append('referenceText', request.referenceText)
      formData.append('language', request.language)

      const response = await apiClient.post<
        AIServiceResponse<AssessmentResponse>
      >('/api/v1/services/assessment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code:
            error.response?.data?.error?.code || ERROR_ASSESSMENT,
          message:
            error.response?.data?.error?.message ||
            getErrorMessage(ERROR_ASSESSMENT, error.message),
        },
        metadata: {
          serviceType: SERVICE_TYPES.ASSESSMENT,
          provider: AI_PROVIDERS.ENJOY,
        },
      }
    }
  },
}

