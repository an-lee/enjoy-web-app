/**
 * Azure Speech Pronunciation Assessment Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AIServiceResponse, AssessmentResponse } from '@/page/ai/types'
import { AIServiceType, AIProvider } from '@/page/ai/types'
import type { AzureSpeechConfig } from '@/page/ai/providers/byok/azure/types'
import { normalizeLanguageForAzure } from '@/page/ai/utils/azure-language'

/**
 * Convert Blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer()
}

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
): Promise<AIServiceResponse<AssessmentResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    )
    // Normalize language code to Azure Speech SDK format
    const azureLanguage = normalizeLanguageForAzure(language)
    speechConfig.speechRecognitionLanguage = azureLanguage

    // Create audio config
    const audioData = await blobToArrayBuffer(audioBlob)
    const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

    // Handle WAV header
    const dataView = new Uint8Array(audioData)
    const hasWavHeader =
      dataView[0] === 0x52 && // R
      dataView[1] === 0x49 && // I
      dataView[2] === 0x46 && // F
      dataView[3] === 0x46    // F

    if (hasWavHeader && audioData.byteLength > 44) {
      pushStream.write(audioData.slice(44))
    } else {
      pushStream.write(audioData)
    }
    pushStream.close()

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream)

    // Create pronunciation assessment config
    const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
      referenceText,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
      true // Enable miscue
    )
    pronunciationConfig.enableProsodyAssessment = true

    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
    pronunciationConfig.applyTo(recognizer)

    const result = await new Promise<SpeechSDK.SpeechRecognitionResult>(
      (resolve, reject) => {
        recognizer!.recognizeOnceAsync(
          (result: SpeechSDK.SpeechRecognitionResult) => resolve(result),
          (error: string) => reject(new Error(error))
        )
      }
    )

    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      const pronunciationResult =
        SpeechSDK.PronunciationAssessmentResult.fromResult(result)

      // Extract word-level results
      const wordResults: AssessmentResponse['wordResults'] = []
      const jsonResult = result.properties.getProperty(
        SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
      )

      if (jsonResult) {
        try {
          const parsed = JSON.parse(jsonResult)
          const nBest = parsed.NBest?.[0]

          if (nBest?.Words) {
            for (const word of nBest.Words) {
              wordResults.push({
                word: word.Word || '',
                accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                errorType: word.PronunciationAssessment?.ErrorType || 'None',
              })
            }
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }

      return {
        success: true,
        data: {
          overallScore: pronunciationResult.pronunciationScore,
          accuracyScore: pronunciationResult.accuracyScore,
          fluencyScore: pronunciationResult.fluencyScore,
          prosodyScore: pronunciationResult.prosodyScore,
          wordResults: wordResults.length > 0 ? wordResults : undefined,
        },
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

