/**
 * Azure Speech Pronunciation Assessment Service
 * Uses Azure Speech SDK with token from /api/azure/tokens
 *
 * Provides phoneme-level pronunciation scoring and feedback.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { getAzureToken } from './token-manager'
import type { AIServiceResponse, AssessmentResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'

/**
 * Convert Blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer()
}

/**
 * Assess pronunciation using Azure Speech SDK
 *
 * @param audioBlob - Audio recording of the user's speech
 * @param referenceText - The text that should have been spoken
 * @param language - Language code for assessment
 * @returns Assessment response with scores and word-level feedback
 */
export async function assess(
  audioBlob: Blob,
  referenceText: string,
  language: string
): Promise<AIServiceResponse<AssessmentResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  try {
    // Get Azure token
    const { token, region } = await getAzureToken()

    // Create speech config with auth token
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      token,
      region
    )
    speechConfig.speechRecognitionLanguage = language

    // Convert audio blob to ArrayBuffer
    const audioData = await blobToArrayBuffer(audioBlob)

    // Create audio config from ArrayBuffer
    // Azure SDK expects WAV format
    const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

    // Push audio data (skip WAV header if present - first 44 bytes)
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

    // Create recognizer
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
    pronunciationConfig.applyTo(recognizer)

    // Perform assessment
      const result = await new Promise<SpeechSDK.SpeechRecognitionResult>(
        (resolve, reject) => {
          recognizer!.recognizeOnceAsync(
            (result: SpeechSDK.SpeechRecognitionResult) => resolve(result),
            (error: string) => reject(new Error(error))
          )
        }
      )

    // Check result
    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      const pronunciationResult =
        SpeechSDK.PronunciationAssessmentResult.fromResult(result)

      // Extract word-level results
      const wordResults: AssessmentResponse['wordResults'] = []

      // Get detailed JSON result for word-level analysis
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

