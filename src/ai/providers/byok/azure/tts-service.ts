/**
 * Azure Speech TTS Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { AIServiceResponse, TTSResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { AzureSpeechConfig } from './types'

/**
 * Voice mapping for different languages
 * Maps language codes to Azure Neural Voice names
 */
const VOICE_MAP: Record<string, string> = {
  'en': 'en-US-JennyNeural',
  'en-US': 'en-US-JennyNeural',
  'en-GB': 'en-GB-SoniaNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  'ja': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural',
  'es': 'es-ES-ElviraNeural',
  'fr': 'fr-FR-DeniseNeural',
  'de': 'de-DE-KatjaNeural',
  'pt': 'pt-BR-FranciscaNeural',
}

/**
 * Get voice name for language
 */
function getVoiceForLanguage(language: string, preferredVoice?: string): string {
  if (preferredVoice) {
    return preferredVoice
  }

  const baseLanguage = language.split('-')[0].toLowerCase()
  return VOICE_MAP[language] || VOICE_MAP[baseLanguage] || 'en-US-JennyNeural'
}

/**
 * Synthesize speech using user-provided Azure subscription key
 *
 * @param text - Text to synthesize
 * @param language - Language code for synthesis
 * @param voice - Optional voice name override
 * @param config - Azure subscription key and region
 * @param signal - AbortSignal for cancellation
 * @returns TTS response with audio blob
 */
export async function synthesize(
  text: string,
  language: string,
  voice: string | undefined,
  config: AzureSpeechConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<TTSResponse>> {
  let synthesizer: SpeechSDK.SpeechSynthesizer | null = null

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    )

    // Set output format to MP3
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    // Set voice
    speechConfig.speechSynthesisVoiceName = getVoiceForLanguage(language, voice)

    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig)

    if (signal?.aborted) {
      throw new Error('Request was cancelled')
    }

    const result = await new Promise<SpeechSDK.SpeechSynthesisResult>(
      (resolve, reject) => {
        const abortHandler = () => {
          synthesizer?.close()
          reject(new Error('Request was cancelled'))
        }

        if (signal) {
          signal.addEventListener('abort', abortHandler)
        }

        synthesizer!.speakTextAsync(
          text,
          (result: SpeechSDK.SpeechSynthesisResult) => {
            if (signal) signal.removeEventListener('abort', abortHandler)
            resolve(result)
          },
          (error: string) => {
            if (signal) signal.removeEventListener('abort', abortHandler)
            reject(new Error(error))
          }
        )
      }
    )

    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
      const audioBlob = new Blob([result.audioData], { type: 'audio/mpeg' })
      const duration = result.audioData.byteLength / 4000

      return {
        success: true,
        data: {
          audioBlob,
          format: 'audio/mpeg',
          duration,
        },
        metadata: {
          serviceType: AIServiceType.TTS,
          provider: AIProvider.BYOK,
        },
      }
    } else {
      const errorDetails = SpeechSDK.CancellationDetails.fromResult(result as any)
      throw new Error(`TTS failed: ${errorDetails.errorDetails}`)
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_AZURE_TTS_ERROR',
        message: error.message || 'Azure Speech TTS failed',
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.BYOK,
      },
    }
  } finally {
    if (synthesizer) synthesizer.close()
  }
}

