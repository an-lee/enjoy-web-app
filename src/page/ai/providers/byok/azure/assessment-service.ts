/**
 * Azure Speech Pronunciation Assessment Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AIServiceResponse } from '@/page/ai/types'
import { AIServiceType, AIProvider } from '@/page/ai/types'
import type { AzureSpeechConfig } from '@/page/ai/providers/byok/azure/types'
import { normalizeLanguageForAzure, prepareAudioConfig, createPronunciationConfig, performAssessment, processAssessmentResult, cleanReferenceText } from '@/page/ai/utils/azure'

/**
 * Assess pronunciation using user-provided Azure subscription key
 *
 * @param audioBlob - Audio recording of the user's speech
 * @param referenceText - The text that should have been spoken
 * @param language - Language code for assessment
 * @param config - Azure subscription key and region
 * @returns Assessment response with scores and word-level feedback
 */
export async function assess(
  audioBlob: Blob,
  referenceText: string,
  language: string,
  config: AzureSpeechConfig
): Promise<AIServiceResponse<import('@/page/ai/types').AssessmentResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  try {
    // Clean up reference text
    const cleanedReferenceText = cleanReferenceText(referenceText)

    // Create speech config with subscription key
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    )
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
      const data = processAssessmentResult(result, cleanedReferenceText, false)

      return {
        success: true,
        data,
        metadata: {
          serviceType: AIServiceType.ASSESSMENT,
          provider: AIProvider.BYOK,
        },
      }
    } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
      return {
        success: false,
        error: {
          code: 'BYOK_ASSESSMENT_NO_SPEECH',
          message: 'No speech detected in the audio. Please try again.',
        },
        metadata: {
          serviceType: AIServiceType.ASSESSMENT,
          provider: AIProvider.BYOK,
        },
      }
    } else {
      const cancellation = SpeechSDK.CancellationDetails.fromResult(result)
      throw new Error(`Assessment failed: ${cancellation.errorDetails}`)
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_ASSESSMENT_ERROR',
        message: error.message || 'Azure Speech assessment failed',
      },
      metadata: {
        serviceType: AIServiceType.ASSESSMENT,
        provider: AIProvider.BYOK,
      },
    }
  } finally {
    if (recognizer) recognizer.close()
  }
}

