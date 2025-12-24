/**
 * Azure Speech Pronunciation Assessment Service
 * Uses Azure Speech SDK with token from /api/azure/tokens
 *
 * Provides phoneme-level pronunciation scoring and feedback.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { getAzureToken } from './token-manager'
import type { AIServiceResponse } from '@/page/ai/types'
import { AIServiceType, AIProvider } from '@/page/ai/types'
import { normalizeLanguageForAzure, prepareAudioConfig, createPronunciationConfig, performAssessment, processAssessmentResult, cleanReferenceText } from '@/page/ai/utils/azure'

/**
 * Assess pronunciation using Azure Speech SDK
 *
 * @param audioBlob - Audio recording of the user's speech
 * @param referenceText - The text that should have been spoken
 * @param language - Language code for assessment
 * @param durationMs - Optional duration of audio in milliseconds (for usage tracking)
 * @returns Assessment response with scores and word-level feedback
 */
export async function assess(
  audioBlob: Blob,
  referenceText: string,
  language: string,
  durationMs?: number
): Promise<AIServiceResponse<import('@/page/ai/types').AssessmentResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  try {
    // Clean up reference text
    const cleanedReferenceText = cleanReferenceText(referenceText)

    // Calculate duration in seconds for usage tracking
    // If duration is not provided, estimate from blob size or use default
    let durationSeconds = 15 // default
    if (durationMs !== undefined && durationMs > 0) {
      durationSeconds = Math.ceil(durationMs / 1000)
    } else {
      // Estimate from blob size (rough estimate: assume 16kHz, 16-bit, mono = 32KB per second)
      // This is a fallback if duration is not provided
      const estimatedSeconds = Math.ceil(audioBlob.size / 32000)
      if (estimatedSeconds > 0 && estimatedSeconds < 300) {
        // Cap at 5 minutes for safety
        durationSeconds = estimatedSeconds
      }
    }

    // Get Azure token with usage information
    const { token, region } = await getAzureToken({
      purpose: 'assessment',
      assessment: {
        durationSeconds,
      },
    })

    // Create speech config with auth token
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region)
    // Normalize language code to Azure Speech SDK format
    const azureLanguage = normalizeLanguageForAzure(language)
    speechConfig.speechRecognitionLanguage = azureLanguage

    // Prepare audio config (converts to WAV and creates stream)
    const { audioConfig } = await prepareAudioConfig(audioBlob)

    // Create pronunciation assessment config
    const pronunciationConfig = createPronunciationConfig(cleanedReferenceText)

    // Create recognizer
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
    pronunciationConfig.applyTo(recognizer)

    // Perform assessment
    const result = await performAssessment(recognizer)

    // Process result
    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      const data = processAssessmentResult(result, cleanedReferenceText, true)

      return {
        success: true,
        data,
        metadata: {
          serviceType: AIServiceType.ASSESSMENT,
          provider: AIProvider.ENJOY,
        },
      }
    } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
      return {
        success: false,
        error: {
          code: 'ENJOY_ASSESSMENT_NO_SPEECH',
          message: 'No speech detected in the audio. Please try again.',
        },
        metadata: {
          serviceType: AIServiceType.ASSESSMENT,
          provider: AIProvider.ENJOY,
        },
      }
    } else {
      const cancellation = SpeechSDK.CancellationDetails.fromResult(result)
      throw new Error(
        `Assessment failed: ${cancellation.reason} - ${cancellation.errorDetails}`
      )
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_ASSESSMENT_ERROR',
        message: error.message || 'Azure Speech assessment failed',
      },
      metadata: {
        serviceType: AIServiceType.ASSESSMENT,
        provider: AIProvider.ENJOY,
      },
    }
  } finally {
    // Clean up recognizer
    if (recognizer) {
      recognizer.close()
    }
  }
}

