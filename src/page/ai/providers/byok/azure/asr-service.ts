/**
 * Azure Speech ASR Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AIServiceResponse, ASRResponse } from '@/page/ai/types'
import { AIServiceType, AIProvider } from '@/page/ai/types'
import type { AzureSpeechConfig } from './types'
import { normalizeLanguageForAzure, convertToWav } from '@/page/ai/utils/azure'

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

    // Convert audio blob to WAV format (16kHz, 16-bit, mono)
    // Azure Speech SDK supports WAV files directly
    const wavBlob = await convertToWav(audioBlob)

    // Create audio config from WAV file
    // Azure SDK supports WAV files directly via pushStream
    const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

    // Write WAV file to stream (Azure SDK can handle WAV format directly)
    const wavArrayBuffer = await wavBlob.arrayBuffer()
    pushStream.write(wavArrayBuffer)
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

