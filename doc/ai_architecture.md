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

## Code Organization

### Directory Structure

The AI services module follows a clean, layered architecture with clear separation of concerns:

```
src/services/ai/
├── core/                      # Core abstractions and utilities
│   ├── config.ts              # Unified configuration management
│   ├── error-handler.ts       # Unified error handling
│   ├── provider-router.ts     # Provider routing abstraction
│   └── index.ts               # Core exports
│
├── services/                  # Service routers (public API layer)
│   ├── index.ts               # Services export
│   ├── asr.ts                 # Automatic Speech Recognition
│   ├── tts.ts                 # Text-to-Speech
│   ├── smart-translation.ts   # Smart Translation
│   ├── dictionary.ts          # Dictionary Lookup
│   └── assessment.ts          # Pronunciation Assessment
│
├── providers/                 # Provider implementations (internal)
│   ├── enjoy/                 # Enjoy API provider
│   │   ├── index.ts
│   │   ├── llm-service.ts     # Smart Translation, Dictionary
│   │   ├── speech-service.ts  # ASR, TTS
│   │   └── azure-speech.ts    # Azure Speech token + SDK
│   │
│   ├── local/                 # Local model provider
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── services/          # Service implementations
│   │   ├── utils/             # Utilities (audio, progress)
│   │   └── workers/           # Web Worker implementations
│   │
│   └── byok/                  # BYOK provider
│       ├── index.ts
│       ├── llm-service.ts     # LLM services (Vercel AI SDK)
│       └── speech-service.ts  # Speech services (OpenAI SDK)
│
├── types/                     # Type definitions
│   ├── core.ts                # Core types (enums, configs)
│   ├── responses.ts           # Response types
│   └── index.ts               # Type exports
│
├── constants/                 # Constants and error codes
│   ├── config.ts              # Configuration constants
│   ├── error-codes.ts         # Error code definitions
│   ├── error-messages.ts      # Error message mappings
│   └── index.ts               # Constants exports
│
├── prompts/                   # Centralized prompts
│   ├── index.ts
│   ├── language-utils.ts
│   ├── translation-prompts.ts
│   └── dictionary-prompts.ts
│
├── key-management.ts          # BYOK key management utilities
└── index.ts                   # Unified exports (public API)
```

### Architecture Layers

The codebase is organized into clear layers:

1. **Public API Layer** (`services/`)
   - High-level service routers
   - Clean, consistent interface
   - Provider-agnostic

2. **Core Abstraction Layer** (`core/`)
   - Configuration management
   - Error handling
   - Provider routing

3. **Provider Implementation Layer** (`providers/`)
   - Provider-specific implementations
   - Internal use (can be exported for advanced usage)
   - Isolated from each other

4. **Shared Resources** (`types/`, `constants/`, `prompts/`)
   - Shared type definitions
   - Configuration constants
   - Prompt templates

### Core Abstractions

#### 1. Configuration Management (`core/config.ts`)

Unified configuration handling that combines settings store access and provider selection:

```typescript
import { getAIServiceConfig, selectProvider } from '@/services/ai/core'

// Get configuration from settings
const config = getAIServiceConfig('smartTranslation')

// Auto-select provider based on user status
const provider = selectProvider(undefined, AIServiceType.SMART_TRANSLATION)
```

**Key Functions**:
- `getAIServiceConfig()`: Get service configuration from settings store
- `selectProvider()`: Automatically select provider based on user status and service type
- `mergeAIServiceConfig()`: Merge user configuration with defaults

#### 2. Error Handling (`core/error-handler.ts`)

Unified error handling for consistent responses across all services:

```typescript
import { createSuccessResponse, handleProviderError } from '@/services/ai/core'

// Create success response
const response = createSuccessResponse(data, AIServiceType.ASR, AIProvider.LOCAL)

// Handle errors
const errorResponse = handleProviderError(
  error,
  ERROR_ASR_LOCAL,
  AIServiceType.ASR,
  AIProvider.LOCAL
)
```

**Key Functions**:
- `createSuccessResponse()`: Create standardized success response
- `createErrorResponse()`: Create standardized error response
- `handleProviderError()`: Handle provider-specific errors
- `withErrorHandling()`: Wrap async calls with error handling

#### 3. Provider Router (`core/provider-router.ts`)

Unified routing layer that routes requests to appropriate providers:

```typescript
import { routeToProvider } from '@/services/ai/core'

const { response, provider } = await routeToProvider({
  serviceType: AIServiceType.ASR,
  request,
  config: request.config,
  handlers: {
    local: async (req, config) => { /* ... */ },
    enjoy: async (req) => { /* ... */ },
    byok: async (req, byokConfig) => { /* ... */ },
    byokAzure: async (req, azureConfig) => { /* ... */ },
  },
})
```

**Benefits**:
- Single routing logic for all services
- Automatic provider selection
- Consistent error handling
- Easy to extend with new providers

### Service Routers

Service routers are high-level APIs located in `services/` that provide a clean interface for each AI service. They use the core abstractions to handle provider routing and error handling.

**Example: ASR Service**

```typescript
export const asrService = {
  async transcribe(request: ASRRequest): Promise<AIServiceResponse<ASRResponse>> {
    try {
      const { response, provider } = await routeToProvider({
        serviceType: AIServiceType.ASR,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => { /* ... */ },
          enjoy: async (req) => { /* ... */ },
          byok: async (req, byokConfig) => { /* ... */ },
          byokAzure: async (req, azureConfig) => { /* ... */ },
        },
      })
      return createSuccessResponse(response, AIServiceType.ASR, provider)
    } catch (error) {
      return handleProviderError(error, ERROR_ASR_AZURE, AIServiceType.ASR, AIProvider.ENJOY)
    }
  },
}
```

**Benefits**:
- Clean, consistent API
- Automatic provider routing
- Unified error handling
- Easy to maintain and extend

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
        ├─ Service Router (services/asr.ts, services/tts.ts, etc.)
        │   │
        │   └─ Provider Router (core/provider-router.ts)
        │       │
        │       ├─ provider: 'enjoy' (default)
        │       │   └─> Enjoy Provider (providers/enjoy/)
        │       │       └─> Enjoy API (OpenAI-compatible or Azure token)
        │       │
        │       ├─ provider: 'local'
        │       │   └─> Local Provider (providers/local/)
        │       │       └─> Browser transformers.js (Web Workers)
        │       │
        │       └─ provider: 'byok' (FUTURE)
        │           └─> BYOK Provider (providers/byok/)
        │               └─> Vercel AI SDK / Official SDKs
```

### Type System

All types are defined in `/src/services/ai/types/`:

```typescript
// Provider Types
enum AIProvider {
  ENJOY = 'enjoy',
  LOCAL = 'local',
  BYOK = 'byok',
}

enum BYOKProvider {
  OPENAI = 'openai',
  GOOGLE = 'google',
  CLAUDE = 'claude',
  AZURE = 'azure',
  CUSTOM = 'custom',
}

// Service Types
enum AIServiceType {
  SMART_TRANSLATION = 'smartTranslation',
  DICTIONARY = 'dictionary',
  ASR = 'asr',
  TTS = 'tts',
  ASSESSMENT = 'assessment',
}

// Configuration
interface AIServiceConfig {
  provider: AIProvider
  byok?: BYOKConfig              // For BYOK mode
  localModel?: LocalModelConfig  // For local mode
}
```

## Services Overview

### 1. Fast Translation (FREE)

- **File**: Not in AI services (regular API service)
- **Purpose**: Quick subtitle translation using dedicated translation models
- **Models**: M2M100, NLLB
- **Providers**: **Enjoy API only** (no local/BYOK)
- **Cost**: **Always FREE**

### 2. Smart Translation

- **File**: `services/smart-translation.ts`
- **Purpose**: Style-aware translation for user-generated content
- **Models**: Generative LLMs
- **Providers**: Enjoy API, Local, BYOK (OpenAI, Claude, Gemini, Azure, Custom)
- **Styles**: literal, natural, casual, formal, simplified, detailed, custom

### 3. Dictionary Lookup (Two-Tier)

- **File**: `services/dictionary.ts`
- **Purpose**: Word definitions and contextual explanations

#### Basic Lookup (FREE)
- Simple definitions without AI
- Always uses Enjoy API
- Returns: definitions, translations, part of speech

#### Contextual Explanation (AI)
- Context-aware detailed analysis
- Uses LLM (same principle as smart translation)
- **Providers**: Enjoy API, Local, BYOK

### 4. ASR (Speech-to-Text)

- **File**: `services/asr.ts`
- **Purpose**: Convert audio to timestamped text
- **Primary Model**: Whisper
- **Providers**: Enjoy API (OpenAI-compatible), Local (transformers.js), BYOK (OpenAI, Azure)

### 5. TTS (Text-to-Speech)

- **File**: `services/tts.ts`
- **Purpose**: Convert text to audio for shadowing practice
- **Providers**: Enjoy API (OpenAI-compatible), Local (Web Speech API), BYOK (OpenAI, Azure)

### 6. Pronunciation Assessment (Azure Only)

- **File**: `services/assessment.ts`
- **Purpose**: Evaluate pronunciation accuracy
- **Provider**: **Azure Speech only** (only provider that supports phoneme-level assessment)
- **Modes**:
  1. **Enjoy Mode**: Enjoy API provides short-lived Azure Speech token
  2. **BYOK Mode** (FUTURE): User provides own Azure Speech subscription key
- **Implementation**: Frontend uses Azure Speech SDK directly with token or key

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
    "ai": "^5.0.0",
    "@ai-sdk/openai": "^2.0.0",
    "@ai-sdk/anthropic": "^2.0.0",
    "@ai-sdk/google": "^2.0.0",
    "openai": "^6.0.0"
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

### 1. Always Use Core Abstractions

```typescript
// ✅ Good: Use core abstractions
import { routeToProvider, createSuccessResponse } from '@/services/ai/core'
const { response, provider } = await routeToProvider({ ... })
return createSuccessResponse(response, serviceType, provider)

// ❌ Bad: Manual provider routing
if (provider === 'local') { /* ... */ }
else if (provider === 'byok') { /* ... */ }
```

### 2. Use Unified Error Handling

```typescript
// ✅ Good: Use error handler
import { handleProviderError } from '@/services/ai/core'
return handleProviderError(error, ERROR_CODE, serviceType, provider)

// ❌ Bad: Manual error handling
return {
  success: false,
  error: { code: 'ERROR', message: error.message },
  metadata: { serviceType, provider },
}
```

### 3. Keep Service Routers Simple

Service routers should only handle:
- Request validation
- Provider routing (via `routeToProvider`)
- Response formatting (via `createSuccessResponse`)

All provider-specific logic should be in provider implementations.

### 4. Centralize Configuration

Use `getAIServiceConfig()` and `selectProvider()` from core instead of accessing settings store directly.

### 5. Import from Public API

```typescript
// ✅ Good: Import from public API
import { asrService, aiServices } from '@/services/ai'

// ⚠️  Advanced: Import specific providers if needed
import { localModelService } from '@/services/ai/providers/local'
```

## Technology Stack

### Core Dependencies

```json
{
  "ai": "^5.0.0",
  "@ai-sdk/openai": "^2.0.0",
  "@ai-sdk/anthropic": "^2.0.0",
  "@ai-sdk/google": "^2.0.0",
  "openai": "^6.0.0",
  "@huggingface/transformers": "^3.0.0"
}
```

## Conclusion

The AI Service architecture is designed for:

- **Clarity**: Clear separation of concerns with layered architecture
- **Flexibility**: Multiple providers (Enjoy, Local, BYOK) via unified routing
- **Consistency**: Unified error handling and response formats
- **Maintainability**: Centralized configuration, types, and prompts
- **Extensibility**: Easy to add new providers or services
- **User Choice**: Free services + Optional AI (local/Enjoy/BYOK)

All AI-powered providers use the same prompt templates and core abstractions, ensuring consistent output quality and maintainable code regardless of the chosen provider.
