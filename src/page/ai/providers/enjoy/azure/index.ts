/**
 * Azure Speech Services Export
 * Services that use Azure Speech SDK with token from Enjoy API
 *
 * Services:
 * - TTS: High-quality text-to-speech using Azure Neural Voices
 * - Assessment: Pronunciation assessment with phoneme-level feedback
 *
 * Token Management:
 * - Tokens are fetched from /api/azure/tokens
 * - Tokens are cached for 9 minutes (Azure tokens expire after 10 minutes)
 */

// Token management
export {
  getAzureToken,
  clearAzureTokenCache,
  isAzureSpeechAvailable,
} from './token-manager'
export type { AzureTokenResponse } from './token-manager'

// TTS service
export { synthesize as synthesizeWithAzure } from './tts-service'

// Assessment service
export { assess as assessWithAzure } from './assessment-service'

// Voice options
export {
  AZURE_TTS_VOICES,
  getAzureTTSVoices,
  getDefaultAzureTTSVoice,
} from './voices'
// Note: VoiceOption type is exported from '@/page/ai/constants/tts-voices'

