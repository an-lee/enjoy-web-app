/**
 * Azure Speech Pronunciation Assessment Service
 * Uses Azure Speech SDK with token from /api/azure/tokens
 *
 * Provides phoneme-level pronunciation scoring and feedback.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { getAzureToken } from './token-manager'
import type { AIServiceResponse, AssessmentResponse } from '../../../types'
import { AIServiceType, AIProvider } from '@/page/ai/types'
import { normalizeLanguageForAzure } from '@/page/ai/utils/azure-language'
import { convertToWav } from '@/page/ai/utils/audio-converter'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'AzureAssessment' })

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
): Promise<AIServiceResponse<AssessmentResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  // Clean up reference text: remove line breaks and extra whitespace
  const cleanedReferenceText = (referenceText || '').trim()
    .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
    .replace(/\s+/g, ' ')       // Normalize multiple spaces to single space
    .trim();

  try {
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
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      token,
      region
    )
    // Normalize language code to Azure Speech SDK format
    const azureLanguage = normalizeLanguageForAzure(language)
    speechConfig.speechRecognitionLanguage = azureLanguage

    // Convert audio blob to WAV format (16kHz, 16-bit, mono)
    // Azure Speech SDK supports WAV files directly
    let wavBlob: Blob
    try {
      wavBlob = await convertToWav(audioBlob)
      log.debug('Audio converted to WAV', {
        blobType: audioBlob.type,
        blobSize: audioBlob.size,
        wavSize: wavBlob.size,
        wavType: wavBlob.type,
      })
    } catch (error: any) {
      log.error('Failed to convert audio blob to WAV', {
        error: error.message,
        blobType: audioBlob.type,
        blobSize: audioBlob.size,
      })
      throw new Error(`Audio conversion failed: ${error.message}`)
    }

    // Create audio config from WAV file
    // Azure SDK supports WAV files directly via pushStream
    // Note: pushStream.write() can accept the full WAV file (including header)
    const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

    // Write WAV file to stream (Azure SDK can handle WAV format directly)
    const wavArrayBuffer = await wavBlob.arrayBuffer()
    pushStream.write(wavArrayBuffer)
    pushStream.close()

    log.debug('WAV file written to stream', {
      wavSize: wavArrayBuffer.byteLength,
    })

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream)

    // Create pronunciation assessment config
    const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
      cleanedReferenceText,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
      true // Enable miscue
    )
    // Enable prosody assessment
    pronunciationConfig.enableProsodyAssessment = true;
    // Use IPA phoneme alphabet for more detailed phoneme representation
    pronunciationConfig.phonemeAlphabet = 'IPA';
    // Request NBest phoneme details for deeper analysis
    pronunciationConfig.nbestPhonemeCount = 1;
    // Enable prosody assessment
    pronunciationConfig.enableProsodyAssessment = true;

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
    log.debug('Assessment result received', {
      reason: result.reason,
      text: result.text,
      duration: result.duration,
    })

    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      const pronunciationResult =
        SpeechSDK.PronunciationAssessmentResult.fromResult(result)

      log.debug('Pronunciation assessment scores', {
        overallScore: pronunciationResult.pronunciationScore,
        accuracyScore: pronunciationResult.accuracyScore,
        fluencyScore: pronunciationResult.fluencyScore,
        prosodyScore: pronunciationResult.prosodyScore,
        recognizedText: result.text,
        referenceText: cleanedReferenceText,
      })

      // Extract word-level results
      const wordResults: AssessmentResponse['wordResults'] = []

      // Get detailed JSON result for word-level analysis
      const jsonResult = result.properties.getProperty(
        SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
      )

      let fullResult: import('@/page/types/db').PronunciationAssessmentResult | undefined

      if (jsonResult) {
        try {
          const parsed = JSON.parse(jsonResult)
          const nBest = parsed.NBest?.[0]

          // Store full result for detailed analysis
          fullResult = parsed as import('@/page/types/db').PronunciationAssessmentResult

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
          fullResult,
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

