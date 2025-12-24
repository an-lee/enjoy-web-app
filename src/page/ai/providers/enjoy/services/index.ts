/**
 * Enjoy API Services Export
 * Services that use OpenAI-compatible endpoints via EnjoyAIClient
 *
 * Services:
 * - Translation: Basic translation using Cloudflare Workers AI m2m100 (/api/translations)
 * - Smart Translation: Style-aware translation using LLM (/api/chat/completions)
 * - Dictionary: AI-powered word lookup using LLM (/api/chat/completions)
 * - ASR: Speech-to-text using Whisper (/api/audio/transcriptions)
 */

// Translation services
export { translate } from './translation-service'
export { smartTranslate } from './smart-translation-service'
export { contextualTranslate } from './contextual-translation-service'

// Dictionary service
export { lookup } from './dictionary-service'

// ASR service
export { transcribe } from './asr-service'

