# AI Service Architecture

## Overview

This document provides a comprehensive overview of the AI Service architecture, focusing on design principles and implementation patterns for the Enjoy Echo web application.

## Core Design Principles

### 1. OpenAI-Compatible API Standard

**Enjoy API** (our cloud service) follows OpenAI-compatible API specifications for most services:
- Smart Translation, ASR, TTS, Dictionary (contextual) - OpenAI-compatible
- Fast Translation, Dictionary (basic) - Custom Enjoy API (FREE)
- Pronunciation Assessment - Azure Speech Services (token-based)

### 2. Three-Tier Provider Model

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                    (Frontend Application)                    │
└────────────────┬─────────────┬─────────────┬────────────────┘
                 │             │             │
        ┌────────▼─────┐  ┌───▼────┐  ┌─────▼──────┐
        │  Enjoy API   │  │ Local  │  │    BYOK    │
        │   (Cloud)    │  │ Models │  │  (FUTURE)  │
        └──────────────┘  └────────┘  └────────────┘
```

- **Enjoy API**: Managed cloud service (OpenAI-compatible + FREE services)
- **Local**: Browser-based transformers.js models (offline/free)
- **BYOK**: User's own API keys (FUTURE - interface reserved)

### 3. Service Support Matrix

| Service | Enjoy | Local | BYOK (Future) | Cost |
|---------|-------|-------|---------------|------|
| **Fast Translation** | ✅ | ❌ | ❌ | **FREE** |
| **Smart Translation** | ✅ | ✅ | ✅ | Quota/BYOK |
| **Dictionary (basic)** | ✅ | ❌ | ❌ | **FREE** |
| **Dictionary (contextual)** | ✅ | ✅ | ✅ | Quota/BYOK |
| **ASR (Whisper)** | ✅ | ✅ | ✅ | Quota/BYOK |
| **TTS** | ✅ | ✅ | ✅ | Quota/BYOK |
| **Assessment (Azure)** | ✅ | ❌ | ✅ (Azure only) | Quota/BYOK |

**Key:**
- **FREE**: Always available without configuration
- **Quota**: Requires Enjoy account with quota
- **BYOK**: Bring Your Own Key (future implementation)

### 4. Unified Prompt Management

All prompts are centrally managed in `/src/services/ai/prompts/`:

```
prompts/
├── index.ts                  # Exports
├── language-utils.ts         # Language mappings
├── translation-prompts.ts    # Smart translation prompts
└── dictionary-prompts.ts     # Dictionary lookup prompts
```

**Key Benefits**:
- Single source of truth
- Consistent output across all providers (Enjoy, Local, BYOK)
- Easy to maintain and update
- Supports prompt optimization

**Example**:
```typescript
// All providers use the same prompt builder
const prompt = buildSmartTranslationPrompt(text, 'en', 'zh', 'natural')

// Works with:
- Enjoy API (OpenAI-compatible)
- Local (transformers.js)
- BYOK OpenAI (GPT-4)
- BYOK Claude (Claude 3)
- BYOK Gemini (Gemini Pro)
```

## Service Architecture

### Request Flow

```
User Request
    │
    ├─ Fast Translation → Always Enjoy API (FREE)
    ├─ Basic Dictionary → Always Enjoy API (FREE)
    │
    └─ Other Services (Smart Translation, ASR, TTS, etc.)
        │
        ├─ provider: 'enjoy' (default)
        │   └─> Enjoy API (OpenAI-compatible or Azure token)
        │
        ├─ provider: 'local'
        │   └─> Browser transformers.js (Web Workers)
        │
        └─ provider: 'byok' (FUTURE)
            └─> Vercel AI SDK / Official SDKs
```

### Type System

All types are defined in `/src/services/ai/types.ts`:

```typescript
// Provider Types
type AIProvider = 'enjoy' | 'byok' | 'local'
type BYOKProvider = 'openai' | 'google' | 'claude' | 'azure' | 'custom'

// Service Types
type AIServiceType =
  | 'fastTranslation'    // Quick translation (FREE)
  | 'smartTranslation'   // Style-aware translation (LLM)
  | 'tts'                // Text-to-speech
  | 'asr'                // Speech-to-text
  | 'dictionary'         // Word lookup (basic=FREE, contextual=AI)
  | 'assessment'         // Pronunciation assessment (Azure only)

// Configuration
interface AIServiceConfig {
  provider: AIProvider
  byok?: BYOKConfig              // For BYOK mode
  localModel?: LocalModelConfig  // For local mode
}

interface BYOKConfig {
  provider: BYOKProvider
  apiKey: string
  endpoint?: string  // Custom endpoint (for Azure/custom)
  region?: string    // Azure region
  model?: string     // Model name
}
```

## Services Overview

### 1. Fast Translation (FREE)

- **File**: `fast-translation.ts`
- **Purpose**: Quick subtitle translation using dedicated translation models
- **Models**: M2M100, NLLB
- **Providers**: **Enjoy API only** (no local/BYOK)
- **Cost**: **Always FREE**

```typescript
export const fastTranslationService = {
  async translate(request: FastTranslationRequest) {
    // Direct API call - always free
    return await apiClient.post('/api/v1/services/fast-translation', request)
  }
}
```

### 2. Smart Translation

- **File**: `smart-translation.ts`
- **Purpose**: Style-aware translation for user-generated content
- **Models**: Generative LLMs
- **Providers**: Enjoy API, Local, BYOK (OpenAI, Claude, Gemini, Azure, Custom)
- **Styles**: literal, natural, casual, formal, simplified, detailed, custom

```typescript
export const smartTranslationService = {
  async translate(request) {
    if (request.config?.provider === 'local') {
      return localModelService.translate(...)
    }
    if (request.config?.provider === 'byok') {
      return smartTranslateWithBYOK(...)  // FUTURE
    }
    return smartTranslateWithEnjoy(...)
  }
}
```

### 3. Dictionary Lookup (Two-Tier)

- **File**: `dictionary.ts`
- **Purpose**: Word definitions and contextual explanations

#### Basic Lookup (FREE)
- Simple definitions without AI
- Always uses Enjoy API
- Returns: definitions, translations, part of speech

#### Contextual Explanation (AI)
- Context-aware detailed analysis
- Uses LLM (same principle as smart translation)
- **Providers**: Enjoy API, Local, BYOK

```typescript
export const dictionaryService = {
  // Basic lookup - always FREE
  async lookupBasic(word, sourceLanguage, targetLanguage) {
    return await apiClient.post('/api/v1/services/dictionary/basic', ...)
  },

  // Contextual explanation - needs AI
  async lookup(request) {
    if (request.config?.provider === 'local') {
      return localModelService.lookup(...)
    }
    if (request.config?.provider === 'byok') {
      return dictionaryLookupWithBYOK(...)  // FUTURE
    }
    return dictionaryLookupWithEnjoy(...)
  }
}
```

### 4. ASR (Speech-to-Text)

- **File**: `asr.ts`
- **Purpose**: Convert audio to timestamped text
- **Primary Model**: Whisper
- **Providers**: Enjoy API (OpenAI-compatible), Local (transformers.js), BYOK (OpenAI, Azure)

```typescript
export const asrService = {
  async transcribe(request) {
    if (request.config?.provider === 'local') {
      return localModelService.transcribe(...)
    }
    if (request.config?.provider === 'byok') {
      return transcribeWithBYOK(...)  // FUTURE
    }
    return transcribeWithEnjoy(...)
  }
}
```

### 5. TTS (Text-to-Speech)

- **File**: `tts.ts`
- **Purpose**: Convert text to audio for shadowing practice
- **Providers**: Enjoy API (OpenAI-compatible), Local (Web Speech API), BYOK (OpenAI, Azure)

```typescript
export const ttsService = {
  async synthesize(request) {
    if (request.config?.provider === 'local') {
      return localModelService.synthesize(...)
    }
    if (request.config?.provider === 'byok') {
      return synthesizeWithBYOK(...)  // FUTURE
    }
    return synthesizeWithEnjoy(...)
  }
}
```

### 6. Pronunciation Assessment (Azure Only)

- **File**: `assessment.ts`
- **Purpose**: Evaluate pronunciation accuracy
- **Provider**: **Azure Speech only** (only provider that supports phoneme-level assessment)
- **Modes**:
  1. **Enjoy Mode**: Enjoy API provides short-lived Azure Speech token
  2. **BYOK Mode** (FUTURE): User provides own Azure Speech subscription key
- **Implementation**: Frontend uses Azure Speech SDK directly with token or key

```typescript
export const assessmentService = {
  async assess(request) {
    if (request.config?.provider === 'byok' && request.config.byok.provider === 'azure') {
      return azureSpeechService.assessPronunciationWithKey(...)  // FUTURE
    }
    // Default: use Enjoy API to get Azure token
    return azureSpeechService.assessPronunciation(...)
  }
}
```

## File Structure

```
src/services/ai/
├── types.ts                    # Core type definitions
├── types-responses.ts          # Response type definitions
├── index.ts                    # Unified exports
│
├── prompts/                    # Centralized prompts
│   ├── index.ts
│   ├── language-utils.ts
│   ├── translation-prompts.ts
│   └── dictionary-prompts.ts
│
├── enjoy/                      # Enjoy API implementation
│   ├── index.ts
│   ├── llm-service.ts          # Smart Translation, Dictionary (contextual)
│   ├── speech-service.ts       # ASR, TTS
│   └── azure-speech.ts         # Azure Speech token + SDK
│
├── local/                      # Local model implementation
│   ├── index.ts
│   ├── config.ts
│   ├── services/               # Service implementations
│   └── workers/                # Web Worker implementations
│
├── byok/                       # BYOK implementation (FUTURE)
│   ├── index.ts
│   ├── llm-service.ts          # Smart Translation, Dictionary (with Vercel AI SDK)
│   └── speech-service.ts       # ASR, TTS (with OpenAI SDK)
│
├── fast-translation.ts         # Fast Translation (Enjoy only, FREE)
├── smart-translation.ts        # Smart translation router
├── dictionary.ts               # Dictionary router (basic=free, contextual=ai)
├── asr.ts                      # ASR router
├── tts.ts                      # TTS router
├── assessment.ts               # Assessment router (Azure only)
├── provider-adapters.ts        # Provider adapter interfaces (for BYOK)
├── provider-selector.ts        # Provider selection logic
├── key-management.ts           # API key management (BYOK, future)
└── translation.ts              # Legacy translation service
```

## BYOK (Bring Your Own Key) - Future Implementation

### Supported BYOK Providers

1. **OpenAI**: GPT models (translation, dictionary), Whisper (ASR), TTS
2. **Google (Gemini)**: Gemini models for translation and dictionary
3. **Claude (Anthropic)**: Claude models for translation and dictionary
4. **Azure**: Azure OpenAI Service, Azure Speech (ASR, TTS, Assessment)
5. **Custom**: Any OpenAI-compatible endpoint

### BYOK Implementation

BYOK uses **Vercel AI SDK** for unified LLM access and **official SDKs** for speech services:

```json
{
  "dependencies": {
    "ai": "^5.0.0",                    // Vercel AI SDK core
    "@ai-sdk/openai": "^2.0.0",        // OpenAI provider
    "@ai-sdk/anthropic": "^2.0.0",     // Claude provider
    "@ai-sdk/google": "^2.0.0",        // Gemini provider
    "openai": "^6.0.0"                 // OpenAI SDK for speech
  }
}
```

### BYOK Service Support Matrix

| Service | OpenAI | Claude | Gemini | Azure | Custom |
|---------|--------|--------|--------|-------|--------|
| Smart Translation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dictionary (contextual) | ✅ | ✅ | ✅ | ✅ | ✅ |
| ASR | ✅ | ❌ | ❌ | ✅ | ✅ |
| TTS | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assessment | ❌ | ❌ | ❌ | ✅ | ❌ |
| Fast Translation | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dictionary (basic) | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note**: Fast translation and basic dictionary are always free via Enjoy API.

## Best Practices

### 1. Always Use Unified Prompts

```typescript
// ✅ Good: Use centralized prompt builder
import { buildSmartTranslationPrompt } from '@/services/ai/prompts'
const prompt = buildSmartTranslationPrompt(text, srcLang, tgtLang, style)

// ❌ Bad: Build prompts inline
const prompt = `Translate ${text} from ${srcLang} to ${tgtLang}`
```

### 2. Handle All Provider Modes

```typescript
// ✅ Good: Handle all modes
if (useLocal) { /* local logic */ }
else if (useBYOK) { /* BYOK logic - FUTURE */ }
else { /* Enjoy API logic */ }

// ❌ Bad: Assume Enjoy API only
return apiClient.post(...)
```

### 3. Return Consistent Response Format

```typescript
// ✅ Good: Always use AIServiceResponse
return {
  success: true,
  data: result,
  metadata: { serviceType, provider }
}

// ❌ Bad: Return raw data
return result
```

## Technology Stack

### Core Dependencies

```json
{
  "ai": "^5.0.0",                          // Vercel AI SDK (for BYOK)
  "@ai-sdk/openai": "^2.0.0",              // OpenAI provider (for BYOK)
  "@ai-sdk/anthropic": "^2.0.0",           // Claude provider (for BYOK)
  "@ai-sdk/google": "^2.0.0",              // Gemini provider (for BYOK)
  "openai": "^6.0.0",                      // OpenAI SDK for speech (for BYOK)
  "@huggingface/transformers": "^3.0.0"    // Local models
}
```

## Conclusion

The AI Service architecture is designed for:

- **Clarity**: Clear separation of FREE services vs. AI-powered services
- **Flexibility**: Multiple providers (Enjoy, Local, BYOK)
- **Consistency**: Unified prompts and response formats
- **Maintainability**: Centralized configuration and types
- **Extensibility**: Easy to add new providers
- **User Choice**: Free services (fast translation, basic dictionary) + Optional AI (local/Enjoy/BYOK)

All AI-powered providers use the same prompt templates, ensuring consistent output quality regardless of the chosen provider.
