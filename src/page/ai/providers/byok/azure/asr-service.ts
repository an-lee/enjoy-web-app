/**
 * Azure Speech ASR Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AIServiceResponse, ASRResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { AzureSpeechConfig } from './types'
import { normalizeLanguageForAzure } from '../../../utils/azure-language'
import { convertAudioBlobToPCM } from '../../../utils/azure-audio'

/**
 * Transcribe speech using user-provided Azure subscription key
 *
 * @param audioBlob - Audio data to transcribe
 * @param language - Language code for recognition
 * @param config - Azure subscription key and region
 * @returns ASR response with transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  language: string | undefined,
  config: AzureSpeechConfig
): Promise<AIServiceResponse<ASRResponse>> {
  let recognizer: SpeechSDK.SpeechRecognizer | null = null

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    )

    if (language) {
      // Normalize language code to Azure Speech SDK format
      const azureLanguage = normalizeLanguageForAzure(language)
      speechConfig.speechRecognitionLanguage = azureLanguage
    }

    // Convert audio blob to PCM format (16-bit, 16kHz, mono)
    // This handles WebM, WAV, and other formats by decoding with AudioContext
    const pcmData = await convertAudioBlobToPCM(audioBlob)

    // Check if PCM data is empty
    if (pcmData.length === 0) {
      throw new Error('Audio blob contains no audio data')
    }

    // Create audio config from PCM data
    // Azure SDK expects PCM format: 16kHz, 16-bit, mono
    const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

    // Push PCM data to stream
    // Convert Int16Array to ArrayBuffer for pushStream
    const pcmBuffer = new Uint8Array(pcmData).buffer
    pushStream.write(pcmBuffer as ArrayBuffer)
    pushStream.close()

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream)
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)

    const result = await new Promise<SpeechSDK.SpeechRecognitionResult>(
      (resolve, reject) => {
        recognizer!.recognizeOnceAsync(
          (result: SpeechSDK.SpeechRecognitionResult) => resolve(result),
          (error: string) => reject(new Error(error))
        )
      }
    )

    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      return {
        success: true,
        data: {
          text: result.text,
          language,
        },
        metadata: {
          serviceType: AIServiceType.ASR,
          provider: AIProvider.BYOK,
        },
      }
    } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
      return {
        success: true,
        data: {
          text: '',
          language,
        },
        metadata: {
          serviceType: AIServiceType.ASR,
          provider: AIProvider.BYOK,
        },
      }
    } else {
      const cancellation = SpeechSDK.CancellationDetails.fromResult(result)
      throw new Error(`ASR failed: ${cancellation.errorDetails}`)
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_AZURE_ASR_ERROR',
        message: error.message || 'Azure Speech ASR failed',
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.BYOK,
      },
    }
  } finally {
    if (recognizer) recognizer.close()
  }
}

