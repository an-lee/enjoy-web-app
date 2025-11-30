# AI Service Architecture

## Overview

This document provides a comprehensive overview of the AI Service architecture, focusing on design principles and implementation patterns for the Enjoy Echo web application.

## Core Design Principles

### 1. OpenAI-Compatible API Standard

**Enjoy API** (our cloud service) follows OpenAI-compatible API specifications. This ensures:
- Easy integration with existing tools and libraries
- Familiar API patterns for developers
- Simple provider switching (backend can use OpenAI, Cloudflare, or others)

### 2. Three-Tier Provider Model

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                    (Frontend Application)                    │
└────────────────┬─────────────┬─────────────┬────────────────┘
                 │             │             │
        ┌────────▼─────┐  ┌───▼────┐  ┌─────▼──────┐
        │  Enjoy API   │  │ Local  │  │    BYOK    │
        │   (Cloud)    │  │ Models │  │   (✅)     │
        └──────────────┘  └────────┘  └────────────┘
```

- **Enjoy API**: Managed cloud service with quotas
- **Local**: Browser-based transformers.js models
- **BYOK**: User's own API keys (OpenAI, Claude, Gemini, Azure, Custom)

### 3. Unified Prompt Management

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
- Enjoy API (Cloudflare Workers AI)
- Local (transformers.js)
- BYOK OpenAI (GPT-4)
- BYOK Claude (Claude 3)
- BYOK Gemini (Gemini Pro)
```

### 4. BYOK Provider Adapters

BYOK implementation uses **Vercel AI SDK** for unified LLM access:

```typescript
// Unified interface for all LLM providers
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Single function works with all providers
const result = await generateText({
  model: provider(modelName),
  prompt: buildSmartTranslationPrompt(...),
})
```

**Supported BYOK Providers**:
- **OpenAI**: GPT, Whisper, TTS
- **Claude**: Anthropic Claude models
- **Gemini**: Google Gemini models
- **Azure**: Azure OpenAI + Azure Speech
- **Custom**: Any OpenAI-compatible endpoint

## Service Architecture

### Request Flow

```
User Request
    │
    ├─ provider: 'enjoy' (default)
    │   └─> Enjoy API (OpenAI-compatible)
    │
    ├─ provider: 'local'
    │   └─> transformers.js (browser-based)
    │
    └─ provider: 'byok'
        └─> BYOK Services
            ├─ LLM (translation, dictionary)
            │   └─> Vercel AI SDK
            │       ├─> OpenAI
            │       ├─> Claude
            │       ├─> Gemini
            │       └─> Custom
            │
            └─ Speech (ASR, TTS)
                ├─> OpenAI SDK
                └─> Azure Speech SDK
```

### Type System

All types are defined in `/src/services/ai/types.ts`:

```typescript
// Provider Types
type AIProvider = 'enjoy' | 'byok' | 'local'
type BYOKProvider = 'openai' | 'google' | 'claude' | 'azure' | 'custom'

// Service Types
type AIServiceType =
  | 'fastTranslation'    // Quick translation (dedicated models)
  | 'smartTranslation'   // Style-aware translation (LLM)
  | 'tts'                // Text-to-speech
  | 'asr'                // Speech-to-text
  | 'dictionary'         // Contextual word lookup
  | 'assessment'         // Pronunciation assessment

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

## Service Implementation Patterns

### Unified Service Pattern

Each service follows this pattern:

```typescript
export const serviceName = {
  async operation(request: ServiceRequest): Promise<AIServiceResponse<ServiceResponse>> {
    const useLocal = request.config?.provider === 'local'
    const useBYOK = request.config?.provider === 'byok'

    // 1. Local mode
    if (useLocal) {
      return localModelService.operation(...)
    }

    // 2. BYOK mode
    if (useBYOK && request.config?.byok) {
      return byokService.operation(..., request.config.byok)
    }

    // 3. Enjoy API (default)
    return apiClient.post('/api/v1/services/...', request)
  }
}
```

### Unified Error Handling

```typescript
return {
  success: false,
  error: {
    code: 'SERVICE_ERROR',
    message: error.message,
  },
  metadata: {
    serviceType: 'serviceName',
    provider: request.config?.provider || 'enjoy',
  },
}
```

## Services Overview

### 1. Smart Translation
- **Purpose**: Style-aware translation for user-generated content
- **Models**: Generative LLMs
- **Providers**: Enjoy API, Local, BYOK (all LLM providers)
- **Styles**: literal, natural, casual, formal, simplified, detailed, custom

### 2. Fast Translation
- **Purpose**: Quick subtitle translation
- **Models**: Dedicated translation models (M2M100, NLLB)
- **Providers**: Enjoy API, Local
- **Note**: Optimized for speed, no style support

### 3. Dictionary Lookup
- **Purpose**: Contextual word definitions
- **Models**: Generative LLMs
- **Providers**: Enjoy API, Local, BYOK (all LLM providers)

### 4. ASR (Speech-to-Text)
- **Purpose**: Convert audio to text
- **Providers**: Enjoy API (Whisper), Local (transformers.js), BYOK (OpenAI, Azure)

### 5. TTS (Text-to-Speech)
- **Purpose**: Convert text to audio
- **Providers**: Enjoy API (OpenAI), Azure (via token), Local (Web Speech API), BYOK (OpenAI, Azure)

### 6. Pronunciation Assessment
- **Purpose**: Evaluate pronunciation accuracy
- **Providers**: Enjoy API (Azure Speech), BYOK (Azure only)
- **Note**: Only Azure supports this service

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
else if (useBYOK) { /* BYOK logic */ }
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
├── byok/                       # BYOK implementation
│   ├── index.ts
│   ├── llm-service.ts          # LLM services (translation, dictionary)
│   └── speech-service.ts       # Speech services (ASR, TTS)
│
├── local-models/               # Local model implementation
│   ├── index.ts
│   ├── config.ts
│   ├── services/
│   └── workers/
│
├── smart-translation.ts        # Smart translation service
├── fast-translation.ts         # Fast translation service
├── dictionary.ts               # Dictionary service
├── asr.ts                      # ASR service
├── tts.ts                      # TTS service
├── assessment.ts               # Pronunciation assessment service
├── azure-speech.ts             # Azure Speech SDK integration
├── provider-adapters.ts        # Provider adapter interfaces
├── provider-selector.ts        # Provider selection logic
└── key-management.ts           # API key management (future)
```

## Technology Stack

### Core Dependencies

```json
{
  "ai": "^5.0.0",                    // Vercel AI SDK
  "@ai-sdk/openai": "^2.0.0",        // OpenAI provider
  "@ai-sdk/anthropic": "^2.0.0",     // Claude provider
  "@ai-sdk/google": "^2.0.0",        // Gemini provider
  "openai": "^6.0.0",                // OpenAI SDK (speech)
  "@huggingface/transformers": "^3.0.0"  // Local models
}
```

## Conclusion

The AI Service architecture is designed for:

- **Flexibility**: Multiple providers (Enjoy, Local, BYOK)
- **Consistency**: Unified prompts and response formats
- **Maintainability**: Centralized configuration and types
- **Extensibility**: Easy to add new providers
- **User Choice**: Free (local), managed (Enjoy), or BYOK

All providers use the same prompt templates, ensuring consistent output quality regardless of the chosen provider.
