/**
 * BYOK Azure Speech Services Export
 * Services that use Azure Speech SDK with user-provided subscription key
 *
 * Services:
 * - TTS: High-quality text-to-speech using Azure Neural Voices
 * - ASR: Speech-to-text using Azure Speech recognition
 * - Assessment: Pronunciation assessment with phoneme-level feedback
 *
 * Note: These services require user's own Azure Speech subscription key.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 */

// Types
export type { AzureSpeechConfig } from './types'

// TTS service
export { synthesize as synthesizeWithAzure } from './tts-service'

// ASR service
export { transcribe as transcribeWithAzure } from './asr-service'

// Assessment service
export { assess as assessWithAzure } from './assessment-service'

