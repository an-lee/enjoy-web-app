/**
 * Shared Azure Speech Assessment Core Logic
 *
 * Contains common functionality for Azure Speech pronunciation assessment
 * used by both Enjoy API and BYOK providers.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AssessmentResponse } from '@/page/ai/types'
import { convertToWav } from '@/page/ai/utils/azure/audio-converter'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'AzureAssessmentCore' })

/**
 * Clean up reference text: remove line breaks and extra whitespace
 */
export function cleanReferenceText(referenceText: string): string {
  return (referenceText || '')
    .trim()
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim()
}

/**
 * Convert audio blob to WAV format and create audio config
 */
export async function prepareAudioConfig(
  audioBlob: Blob
): Promise<{
  audioConfig: SpeechSDK.AudioConfig
  wavBlob: Blob
}> {
  // Convert audio blob to WAV format (16kHz, 16-bit, mono)
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

  return { audioConfig, wavBlob }
}

/**
 * Create pronunciation assessment configuration
 */
export function createPronunciationConfig(
  referenceText: string
): SpeechSDK.PronunciationAssessmentConfig {
  const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
    referenceText,
    SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
    SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
    true // Enable miscue
  )
  // Enable prosody assessment
  pronunciationConfig.enableProsodyAssessment = true
  // Use IPA phoneme alphabet for more detailed phoneme representation
  pronunciationConfig.phonemeAlphabet = 'IPA'
  // Request NBest phoneme details for deeper analysis
  pronunciationConfig.nbestPhonemeCount = 1

  return pronunciationConfig
}

/**
 * Perform speech recognition with pronunciation assessment
 */
export async function performAssessment(
  recognizer: SpeechSDK.SpeechRecognizer
): Promise<SpeechSDK.SpeechRecognitionResult> {
  const result = await new Promise<SpeechSDK.SpeechRecognitionResult>(
    (resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result: SpeechSDK.SpeechRecognitionResult) => resolve(result),
        (error: string) => reject(new Error(error))
      )
    }
  )

  log.debug('Assessment result received', {
    reason: result.reason,
    text: result.text,
    duration: result.duration,
  })

  return result
}

/**
 * Extract word-level results from assessment result
 */
export function extractWordResults(
  result: SpeechSDK.SpeechRecognitionResult
): {
  wordResults: NonNullable<AssessmentResponse['wordResults']>
  fullResult?: import('@/page/types/db').PronunciationAssessmentResult
} {
  const wordResults: NonNullable<AssessmentResponse['wordResults']> = []

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

  return { wordResults, fullResult }
}

/**
 * Process assessment result and return response data
 */
export function processAssessmentResult(
  result: SpeechSDK.SpeechRecognitionResult,
  referenceText: string,
  includeFullResult = false
): {
  overallScore: number
  accuracyScore: number
  fluencyScore: number
  prosodyScore: number
  wordResults?: AssessmentResponse['wordResults']
  fullResult?: import('@/page/types/db').PronunciationAssessmentResult
} {
  const pronunciationResult =
    SpeechSDK.PronunciationAssessmentResult.fromResult(result)

  log.debug('Pronunciation assessment scores', {
    overallScore: pronunciationResult.pronunciationScore,
    accuracyScore: pronunciationResult.accuracyScore,
    fluencyScore: pronunciationResult.fluencyScore,
    prosodyScore: pronunciationResult.prosodyScore,
    recognizedText: result.text,
    referenceText,
  })

  const { wordResults, fullResult } = extractWordResults(result)

  const response: {
    overallScore: number
    accuracyScore: number
    fluencyScore: number
    prosodyScore: number
    wordResults?: AssessmentResponse['wordResults']
    fullResult?: import('@/page/types/db').PronunciationAssessmentResult
  } = {
    overallScore: pronunciationResult.pronunciationScore,
    accuracyScore: pronunciationResult.accuracyScore,
    fluencyScore: pronunciationResult.fluencyScore,
    prosodyScore: pronunciationResult.prosodyScore,
  }

  if (wordResults.length > 0) {
    response.wordResults = wordResults
  }

  if (includeFullResult && fullResult) {
    response.fullResult = fullResult
  }

  return response
}

