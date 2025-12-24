/**
 * BYOK (Bring Your Own Key) Provider
 * All services for using user-provided API keys
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         BYOK Provider                               │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  OpenAI-Compatible Services (via BYOKClient)                        │
 * │  Uses: OpenAI SDK + Vercel AI SDK                                   │
 * │  Supports: OpenAI, Claude, Google, Azure OpenAI, Custom             │
 * │                                                                     │
 * │  ├── Smart Translation  → LLM chat completion                       │
 * │  ├── Smart Dictionary   → LLM chat completion                       │
 * │  ├── ASR (Whisper)      → OpenAI audio transcriptions               │
 * │  └── TTS (OpenAI)       → OpenAI audio speech                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  Azure Speech Services (via Azure SDK + User Key)                   │
 * │  Uses: microsoft-cognitiveservices-speech-sdk                       │
 * │  Requires: User's Azure Speech subscription key                     │
 * │                                                                     │
 * │  ├── TTS        → Azure Speech SDK (Neural Voices)                  │
 * │  ├── ASR        → Azure Speech SDK (Recognition)                    │
 * │  └── Assessment → Azure Speech SDK (Pronunciation)                  │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ============================================
// Client exports
// ============================================
export { BYOKClient, createBYOKClient } from './client'
export type { BYOKLLMGenerationParams } from './client'

// ============================================
// OpenAI-Compatible Services
// ============================================
export {
  translate as translateWithBYOK,
  smartTranslate as smartTranslateWithBYOK,
  contextualTranslate as contextualTranslateWithBYOK,
  lookup as dictionaryLookupWithBYOK,
  transcribe as transcribeWithBYOK,
  synthesize as synthesizeWithBYOK,
} from './services'

// ============================================
// Azure Speech Services (User Key)
// ============================================
export {
  synthesizeWithAzure as synthesizeWithBYOKAzure,
  transcribeWithAzure as transcribeWithBYOKAzure,
  assessWithAzure as assessWithBYOKAzure,
} from './azure'
export type { AzureSpeechConfig } from './azure'

// ============================================
// Voice Options
// ============================================
export {
  OPENAI_TTS_VOICES,
  AZURE_TTS_VOICES,
  getBYOKTTSVoices,
  getDefaultBYOKTTSVoice,
} from './voices'
// Note: VoiceOption type is exported from '@/page/ai/constants/tts-voices'
