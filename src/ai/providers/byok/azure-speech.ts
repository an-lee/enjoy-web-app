/**
 * BYOK Azure Speech Service
 * Uses Azure Speech SDK with user-provided subscription keys
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../enjoy/azure/ which uses tokens from the server.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type { ASRResponse, TTSResponse, AssessmentResponse } from '../../types'

/**
 * Azure Speech configuration with user-provided key
 */
export interface AzureSpeechConfig {
  subscriptionKey: string
  region: string
}

/**
 * Convert Blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer()
}

/**
 * BYOK Azure Speech Service
 * All methods require user-provided Azure subscription key
 */
export const byokAzureSpeechService = {
  /**
   * Synthesize speech using user-provided Azure key
   */
  async synthesize(
    text: string,
    language: string,
    voice: string | undefined,
    config: AzureSpeechConfig,
    signal?: AbortSignal
  ): Promise<TTSResponse> {
    let synthesizer: SpeechSDK.SpeechSynthesizer | null = null

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        config.subscriptionKey,
        config.region
      )

      // Set output format
      speechConfig.speechSynthesisOutputFormat =
        SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

      // Set voice
      if (voice) {
        speechConfig.speechSynthesisVoiceName = voice
      } else {
        // Default voice based on language
        const baseLanguage = language.split('-')[0].toLowerCase()
        const voiceMap: Record<string, string> = {
          en: 'en-US-JennyNeural',
          zh: 'zh-CN-XiaoxiaoNeural',
          ja: 'ja-JP-NanamiNeural',
          ko: 'ko-KR-SunHiNeural',
          es: 'es-ES-ElviraNeural',
          fr: 'fr-FR-DeniseNeural',
          de: 'de-DE-KatjaNeural',
        }
        speechConfig.speechSynthesisVoiceName =
          voiceMap[baseLanguage] || 'en-US-JennyNeural'
      }

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
        return {
          audioBlob,
          format: 'audio/mpeg',
          duration: result.audioData.byteLength / 4000,
        }
      } else {
        const errorDetails = SpeechSDK.CancellationDetails.fromResult(result as any)
        throw new Error(`TTS failed: ${errorDetails.errorDetails}`)
      }
    } finally {
      if (synthesizer) synthesizer.close()
    }
  },

  /**
   * Transcribe speech using user-provided Azure key
   */
  async transcribe(
    audioBlob: Blob,
    language: string | undefined,
    config: AzureSpeechConfig
  ): Promise<ASRResponse> {
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
        dataView[0] === 0x52 &&
        dataView[1] === 0x49 &&
        dataView[2] === 0x46 &&
        dataView[3] === 0x46

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
          text: result.text,
          language,
        }
      } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
        return {
          text: '',
          language,
        }
      } else {
        const cancellation = SpeechSDK.CancellationDetails.fromResult(result)
        throw new Error(`ASR failed: ${cancellation.errorDetails}`)
      }
    } finally {
      if (recognizer) recognizer.close()
    }
  },

  /**
   * Assess pronunciation using user-provided Azure key
   */
  async assessPronunciation(
    audioBlob: Blob,
    referenceText: string,
    language: string,
    config: AzureSpeechConfig
  ): Promise<AssessmentResponse> {
    let recognizer: SpeechSDK.SpeechRecognizer | null = null

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        config.subscriptionKey,
        config.region
      )
      speechConfig.speechRecognitionLanguage = language

      // Create audio config
      const audioData = await blobToArrayBuffer(audioBlob)
      const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
      const pushStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat)

      const dataView = new Uint8Array(audioData)
      const hasWavHeader =
        dataView[0] === 0x52 &&
        dataView[1] === 0x49 &&
        dataView[2] === 0x46 &&
        dataView[3] === 0x46

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
        true
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

        // Extract word results
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
            // Ignore parsing errors
          }
        }

        return {
          overallScore: pronunciationResult.pronunciationScore,
          accuracyScore: pronunciationResult.accuracyScore,
          fluencyScore: pronunciationResult.fluencyScore,
          prosodyScore: pronunciationResult.prosodyScore,
          wordResults: wordResults.length > 0 ? wordResults : undefined,
        }
      } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
        throw new Error('No speech detected in the audio')
      } else {
        const cancellation = SpeechSDK.CancellationDetails.fromResult(result)
        throw new Error(`Assessment failed: ${cancellation.errorDetails}`)
      }
    } finally {
      if (recognizer) recognizer.close()
    }
  },
}

