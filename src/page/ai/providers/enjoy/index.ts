/**
 * Enjoy API Provider
 * All services for calling Enjoy API (Hono API Worker)
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Enjoy Provider                           │
 * ├─────────────────────────────────────────────────────────────┤
 * │  OpenAI-Compatible Services (via EnjoyAIClient)            │
 * │  ├── Smart Translation  → /api/chat/completions            │
 * │  ├── Smart Dictionary   → /api/chat/completions            │
 * │  ├── Basic Translation  → /api/translations (non-standard) │
 * │  └── ASR (Whisper)      → /api/audio/transcriptions        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Azure Speech Services (via Azure SDK + token)              │
 * │  ├── TTS                → Azure Speech SDK                  │
 * │  └── Assessment         → Azure Speech SDK                  │
 * │                                                             │
 * │  Token flow: /api/azure/tokens → Azure Speech SDK          │
 * └─────────────────────────────────────────────────────────────┘
 */

// ============================================
// Client exports
// ============================================
export { EnjoyAIClient, getEnjoyClient, createEnjoyClient } from './client'
export type {
  TranslationParams,
  TranslationResult,
  LLMGenerationParams,
} from './client'

// ============================================
// OpenAI-Compatible Services
// ============================================
export {
  translate as translateWithEnjoy,
  smartTranslate as smartTranslateWithEnjoy,
  lookup as dictionaryLookupWithEnjoy,
  transcribe as transcribeWithEnjoy,
} from './services'

// ============================================
// Azure Speech Services
// ============================================
export {
  synthesizeWithAzure as synthesizeWithEnjoy,
  assessWithAzure as assessWithEnjoy,
  getAzureToken,
  clearAzureTokenCache,
  isAzureSpeechAvailable,
} from './azure'
export type { AzureTokenResponse } from './azure'
