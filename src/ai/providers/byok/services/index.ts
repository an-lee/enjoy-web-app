/**
 * BYOK Services Export
 * Services that use OpenAI-compatible APIs via BYOKClient
 *
 * Services:
 * - Smart Translation: Style-aware translation using LLM
 * - Dictionary: AI-powered word lookup using LLM
 * - ASR: Speech-to-text using OpenAI Whisper
 * - TTS: Text-to-speech using OpenAI TTS
 *
 * Note: For Azure Speech services (with user subscription key), see ../azure/
 */

// LLM services
export { smartTranslate } from './smart-translation-service'
export { lookup } from './dictionary-service'

// Audio services (OpenAI-compatible)
export { transcribe } from './asr-service'
export { synthesize } from './tts-service'

