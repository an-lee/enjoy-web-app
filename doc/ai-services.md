# AI Service Architecture

## Overview

The AI Service module provides a unified, provider-agnostic interface for all AI-powered features in the Enjoy Echo web application. It supports multiple providers (Enjoy API, Local models, and BYOK) through a clean abstraction layer, ensuring consistent behavior regardless of the underlying provider.

**Important**: All AI services are now handled by **Hono API Worker** (`/api/*`). The frontend AI Service Client (`src/ai/`) calls Hono API Worker endpoints, which then process the requests using Cloudflare Workers AI or route to external providers.

**Architecture Flow**:
```
Frontend (AI Service Client)
  → Hono API Worker (/api/*)
    → Cloudflare Workers AI / External Providers
```

See [API Worker Integration Guide](./api-worker-integration.md) for implementation details.

## Core Design Principles

### 1. Three-Tier Provider Model

The architecture supports three provider tiers:

- **Enjoy API**: Managed cloud service with OpenAI-compatible APIs for most services
- **Local**: Browser-based transformers.js models (offline-capable, free)
- **BYOK**: User's own API keys (OpenAI, Google, Claude, Azure, Custom)

### 2. Unified Prompt Management

All prompts are centrally managed in `/src/ai/prompts/`, ensuring consistent output quality across all providers. The same prompt templates are used by Enjoy API, Local models, and BYOK providers.

### 3. Provider-Agnostic Service Layer

Services expose a clean, consistent API independent of the underlying provider. Provider routing is handled automatically based on user configuration and service availability.

### 4. Consistent Code Organization

All providers follow the same organizational structure:
- `client.ts` - Unified client for API access
- `services/` - Individual service implementations
- `azure/` - Azure Speech services (when applicable)

## Service Support Matrix

| Service | Enjoy | Local | BYOK | Cost |
|---------|-------|-------|------|------|
| **Translation** | ✅ | ❌ | ❌ | FREE |
| **Smart Translation** | ✅ | ✅ | ✅ | Quota/BYOK |
| **Smart Dictionary (contextual)** | ✅ | ✅ | ✅ | Quota/BYOK |
| **ASR (Whisper)** | ✅ | ✅ | ✅ | Quota/BYOK |
| **TTS** | ✅ | ✅ | ✅ | Quota/BYOK |
| **Assessment (Azure)** | ✅ | ❌ | ✅ (Azure only) | Quota/BYOK |

**Note**: Translation service is always free and only uses Enjoy API (fast translation models like M2M100, NLLB). All other AI services are handled by Hono API Worker with provider selection.

## Architecture Layers

### 1. Public API Layer (`services/`)

High-level service routers that provide clean, consistent interfaces:

- `translationService` - Basic translation (Enjoy AI free)
- `asrService` - Automatic Speech Recognition
- `ttsService` - Text-to-Speech
- `smartTranslationService` - Style-aware translation
- `smartDictionaryService` - Contextual dictionary lookup (AI-powered)
- `assessmentService` - Pronunciation assessment

### 2. Core Abstraction Layer (`core/`)

Unified utilities for configuration, error handling, and provider routing:

- **Configuration Management**: Retrieves settings from store, merges with defaults, selects appropriate provider
- **Error Handling**: Standardized error responses with consistent format
- **Provider Router**: Automatically routes requests to the correct provider based on configuration

### 3. Provider Implementation Layer (`providers/`)

Provider-specific implementations isolated from each other. All providers follow a consistent structure:

#### Enjoy Provider (`providers/enjoy/`)

```
enjoy/
├── client.ts                    # EnjoyAIClient (OpenAI-compatible)
├── services/                    # OpenAI-compatible services
│   ├── translation-service.ts  # Basic translation (/api/translations)
│   ├── smart-translation-service.ts  # LLM translation (/api/chat/completions)
│   ├── dictionary-service.ts   # LLM dictionary (/api/chat/completions)
│   └── asr-service.ts          # Whisper ASR (/api/audio/transcriptions)
└── azure/                      # Azure Speech services (token-based)
    ├── token-manager.ts        # Token cache from /api/azure/tokens
    ├── tts-service.ts          # Azure Neural Voices
    └── assessment-service.ts   # Azure Pronunciation Assessment
```

**Key Features**:
- Uses `EnjoyAIClient` for OpenAI-compatible endpoints
- Azure Speech services use tokens from `/api/azure/tokens`
- Token caching (9 minutes) for performance

#### BYOK Provider (`providers/byok/`)

```
byok/
├── client.ts                    # BYOKClient (multi-provider support)
├── services/                    # OpenAI-compatible services
│   ├── smart-translation-service.ts  # LLM translation (user's API)
│   ├── dictionary-service.ts   # LLM dictionary (user's API)
│   ├── asr-service.ts          # OpenAI Whisper (user's API)
│   └── tts-service.ts          # OpenAI TTS (user's API)
└── azure/                      # Azure Speech services (user key)
    ├── types.ts                # AzureSpeechConfig type
    ├── tts-service.ts          # Azure Neural Voices (user subscription)
    ├── asr-service.ts          # Azure Speech Recognition (user subscription)
    └── assessment-service.ts   # Azure Pronunciation (user subscription)
```

**Key Features**:
- Uses `BYOKClient` for multi-provider LLM access (OpenAI, Claude, Google, etc.)
- Azure Speech services use user's own subscription key
- Supports OpenAI, Claude, Google, Azure OpenAI, and custom endpoints

#### Local Provider (`providers/local/`)

```
local/
├── index.ts                     # LocalModelService export
├── services/                    # Service implementations
│   ├── asr-service.ts          # Whisper (transformers.js)
│   ├── smart-translation-service.ts  # LLM translation (transformers.js)
│   ├── dictionary-service.ts   # LLM dictionary (transformers.js)
│   └── tts-service.ts          # TTS (transformers.js)
├── workers/                     # Web Workers for model execution
└── utils/                       # Audio processing utilities
```

**Key Features**:
- Browser-based models using transformers.js
- Web Workers for non-blocking execution
- Model initialization and caching
- Offline-capable

### 4. Shared Resources

- **Types** (`types/`): Core type definitions (enums, configs, responses)
- **Constants** (`constants/`): Error codes and configuration constants
- **Prompts** (`prompts/`): Centralized prompt templates

## Request Flow

```text
User Request (Frontend)
    │
    └─ AI Service Client (src/ai/services/*.ts)
        │
        └─ Provider Router (src/ai/core/provider-router.ts)
            │
            ├─ Auto-select provider based on:
            │   - User configuration
            │   - Service availability
            │   - User subscription status
            │
            └─ Route to Provider Implementation
                ├─ Enjoy Provider
                │   ├─ OpenAI-compatible → EnjoyAIClient → /api/* endpoints
                │   └─ Azure Speech → Token from /api/azure/tokens → Azure SDK
                ├─ BYOK Provider
                │   ├─ LLM → BYOKClient → User's API (OpenAI/Claude/Google)
                │   ├─ OpenAI Audio → BYOKClient → User's OpenAI API
                │   └─ Azure Speech → User's subscription key → Azure SDK
                └─ Local Provider
                    └─ transformers.js → Web Workers → Browser
```

**Key Points**:
- Frontend AI Service Client routes requests through provider router
- Provider router automatically selects appropriate provider
- Each provider has consistent structure (client, services, azure)
- Azure services differ: Enjoy uses tokens, BYOK uses user keys

## Provider Details

### Enjoy Provider

**Architecture**:
- **OpenAI-Compatible Services**: Uses `EnjoyAIClient` which wraps OpenAI SDK and Vercel AI SDK
- **Endpoints**:
  - `/api/chat/completions` - Smart Translation, Dictionary
  - `/api/translations` - Basic Translation (non-standard)
  - `/api/audio/transcriptions` - ASR (Whisper)
- **Azure Speech**: Token-based authentication via `/api/azure/tokens`
  - Tokens are cached for 9 minutes (Azure tokens expire after 10 minutes)
  - Services: TTS, Assessment

**Client Usage**:
```typescript
import { getEnjoyClient } from '@/ai/providers/enjoy'

const client = getEnjoyClient()
// LLM generation
const text = await client.generateText({ prompt: '...' })
// ASR
const result = await client.transcribeSpeech(audioBlob)
// Translation (non-standard endpoint)
const translation = await client.translate({ text: '...', targetLang: 'zh' })
```

### BYOK Provider

**Architecture**:
- **LLM Services**: Uses `BYOKClient` with Vercel AI SDK
  - Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
- **OpenAI Audio Services**: Uses OpenAI SDK directly
  - ASR: Whisper API
  - TTS: OpenAI TTS API
- **Azure Speech**: Direct SDK access with user's subscription key
  - No token management needed
  - Services: TTS, ASR, Assessment

**Client Usage**:
```typescript
import { createBYOKClient } from '@/ai/providers/byok'

const client = createBYOKClient({
  provider: 'openai',
  apiKey: 'sk-xxx',
  model: 'gpt-4',
})

// LLM generation
const text = await client.generateText({ prompt: '...' })
// OpenAI TTS
const audioBlob = await client.synthesizeSpeech('Hello world')
```

### Local Provider

**Architecture**:
- **Models**: transformers.js running in Web Workers
- **Services**: All services use browser-based models
- **Model Management**: Initialization, caching, and loading state tracking
- **No Network**: Fully offline-capable

## Core Abstractions

### Configuration Management

The configuration system automatically:

- Retrieves user settings from the settings store
- Merges with service defaults
- Selects appropriate provider based on user status and service type
- Free users default to Local when available; Pro users default to Enjoy

### Error Handling

All services return standardized `AIServiceResponse<T>` with:

- Success/error status
- Data or error details
- Metadata (service type, provider, token usage, cost)

### Provider Router

The `routeToProvider` function handles:

- Automatic provider selection
- Configuration merging
- Provider-specific handler routing
- Special cases (e.g., Azure BYOK mode)

## Services

### Translation (Basic)

Basic translation using Enjoy AI. This is a **free service** that uses fast translation models (M2M100, NLLB) optimized for speed and low cost. No style support - use Smart Translation for style-aware translations.

- **Provider**: Enjoy API only (no Local or BYOK support)
- **Endpoint**: `/api/translations` (non-standard endpoint)
- **Cost**: Always FREE
- **Use case**: Quick translations, subtitle translation, basic text translation

### Smart Translation

Style-aware translation using LLMs. Supports multiple styles (literal, natural, casual, formal, simplified, detailed, custom) and works with all providers that support text generation.

- **Enjoy**: `/api/chat/completions` via `EnjoyAIClient`
- **BYOK**: User's LLM API via `BYOKClient`
- **Local**: transformers.js models in Web Workers

### Smart Dictionary Lookup

Two-tier dictionary service:

- **Basic Dictionary**: Simple definitions via Enjoy API (FREE) - see `@/api/dictionary`
- **Smart Dictionary**: AI-powered contextual detailed analysis with context awareness (all providers) - see `@/ai/services/smart-dictionary`

- **Enjoy**: `/api/chat/completions` via `EnjoyAIClient`
- **BYOK**: User's LLM API via `BYOKClient`
- **Local**: transformers.js models in Web Workers

### ASR (Speech-to-Text)

Whisper-based transcription with timestamped segments. Supports all three provider tiers.

- **Enjoy**: `/api/audio/transcriptions` via `EnjoyAIClient` (OpenAI-compatible)
- **BYOK OpenAI**: User's OpenAI Whisper API via `BYOKClient`
- **BYOK Azure**: User's Azure Speech subscription via Azure SDK
- **Local**: transformers.js Whisper in Web Workers

### TTS (Text-to-Speech)

Text-to-speech conversion for shadowing practice.

- **Enjoy**: Azure Speech SDK with token from `/api/azure/tokens`
- **BYOK OpenAI**: User's OpenAI TTS API via `BYOKClient`
- **BYOK Azure**: User's Azure Speech subscription via Azure SDK
- **Local**: transformers.js TTS models in Web Workers

### Pronunciation Assessment

Azure Speech Services only (requires phoneme-level assessment). Supports Enjoy mode (token-based) and BYOK mode (user's Azure subscription).

- **Enjoy**: Azure Speech SDK with token from `/api/azure/tokens`
- **BYOK**: Azure Speech SDK with user's subscription key
- **Local**: Not supported (requires Azure Speech)

## BYOK (Bring Your Own Key)

BYOK allows users to use their own API keys for supported providers:

- **OpenAI**: GPT models, Whisper, TTS
- **Google (Gemini)**: Gemini models for translation and dictionary
- **Claude (Anthropic)**: Claude models for translation and dictionary
- **Azure**: Azure OpenAI Service, Azure Speech
- **Custom**: Any OpenAI-compatible endpoint

BYOK uses:
- **Vercel AI SDK** for unified LLM access
- **OpenAI SDK** for audio services (when using OpenAI)
- **Azure Speech SDK** for Azure Speech services

## Usage Pattern

All services follow a consistent usage pattern:

1. **Service Request**: Create request object with service-specific parameters
2. **Configuration** (optional): Provide custom provider configuration
3. **Service Call**: Call service method
4. **Response Handling**: Handle standardized response with success/error status

The provider selection is automatic unless explicitly specified in the request configuration.

## Best Practices

1. **Always use service routers** from `services/` - don't call providers directly
2. **Use core abstractions** for configuration and error handling
3. **Import from public API** (`@/ai`) for all service usage
4. **Let the router handle provider selection** - only override when necessary
5. **Handle errors consistently** using the standardized response format
6. **Follow provider structure** - each provider has `client.ts`, `services/`, and `azure/` (when applicable)

## Technology Stack

- **Vercel AI SDK**: Unified LLM access for BYOK
- **OpenAI SDK**: Direct API access for OpenAI-compatible services
- **transformers.js**: Browser-based local models
- **Azure Speech SDK**: Pronunciation assessment and TTS
- **Hono API Worker**: Server-side API endpoints

## Code Organization

All providers follow a consistent structure for maintainability:

```
providers/
├── enjoy/
│   ├── client.ts              # EnjoyAIClient
│   ├── services/              # OpenAI-compatible services
│   └── azure/                 # Azure Speech (token-based)
├── byok/
│   ├── client.ts              # BYOKClient
│   ├── services/              # OpenAI-compatible services
│   └── azure/                 # Azure Speech (user key)
└── local/
    ├── index.ts               # LocalModelService
    ├── services/              # Service implementations
    └── workers/               # Web Workers
```

This structure ensures:
- **Consistency**: Same organization across all providers
- **Maintainability**: Easy to find and update services
- **Clarity**: Clear separation between OpenAI-compatible and Azure services

## Conclusion

The AI Service architecture provides:

- **Unified Interface**: Consistent API across all services and providers
- **Flexible Routing**: Automatic provider selection with manual override capability
- **Consistent Quality**: Shared prompts ensure consistent output across providers
- **Extensibility**: Easy to add new providers or services
- **User Choice**: Multiple tiers from free local models to premium cloud services
- **Consistent Structure**: All providers follow the same organizational pattern
