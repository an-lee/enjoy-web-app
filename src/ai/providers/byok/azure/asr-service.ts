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

/**
 * Convert Blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer()
}

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
      speechConfig.speechRecognitionLanguage = language
    }

    // Create audio config from blob
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

