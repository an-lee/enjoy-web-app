# AI Service Architecture

## Overview

The AI Service module provides a unified, provider-agnostic interface for all AI-powered features in the Enjoy Echo web application. It supports multiple providers (Enjoy API, Local models, and BYOK) through a clean abstraction layer, ensuring consistent behavior regardless of the underlying provider.

**Important**: All AI services are now handled by **Hono API Worker** (`/api/*`). The frontend AI Service Client (`src/services/ai/`) calls Hono API Worker endpoints, which then process the requests using Cloudflare Workers AI or route to external providers.

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

All prompts are centrally managed in `/src/services/ai/prompts/`, ensuring consistent output quality across all providers. The same prompt templates are used by Enjoy API, Local models, and BYOK providers.

### 3. Provider-Agnostic Service Layer

Services expose a clean, consistent API independent of the underlying provider. Provider routing is handled automatically based on user configuration and service availability.

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

Provider-specific implementations isolated from each other:

- **Enjoy**: Cloud API provider (OpenAI-compatible + Azure token)
- **Local**: Browser-based transformers.js models with Web Workers
- **BYOK**: Vercel AI SDK for LLMs, official SDKs for speech services

### 4. Shared Resources

- **Types** (`types/`): Core type definitions (enums, configs, responses)
- **Constants** (`constants/`): Error codes and configuration constants
- **Prompts** (`prompts/`): Centralized prompt templates

## Request Flow

```text
User Request (Frontend)
    │
    └─ AI Service Client (services/ai/services/*.ts)
        │
        └─ HTTP Request to Hono API Worker (/api/*)
            │
            └─ Hono API Worker (src/server/api.ts)
                │
                └─ Provider Router (core/provider-router.ts)
                    │
                    ├─ Auto-select provider based on:
                    │   - User configuration
                    │   - Service availability
                    │   - User subscription status
                    │
                    └─ Route to Provider Implementation
                        ├─ Cloudflare Workers AI (via env.AI binding)
                        ├─ Enjoy Provider → Enjoy API (external)
                        ├─ Local Provider → transformers.js (Web Workers)
                        └─ BYOK Provider → Vercel AI SDK / Official SDKs
```

**Key Points**:
- Frontend AI Service Client makes HTTP requests to Hono API Worker
- Hono API Worker handles all AI processing
- Cloudflare Workers AI is directly accessible via `env.AI` binding
- External providers (Enjoy, BYOK) are called from the Worker

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
- **Cost**: Always FREE
- **Use case**: Quick translations, subtitle translation, basic text translation

### Smart Translation

Style-aware translation using LLMs. Supports multiple styles (literal, natural, casual, formal, simplified, detailed, custom) and works with all providers that support text generation.

### Smart Dictionary Lookup

Two-tier dictionary service:

- **Basic Dictionary**: Simple definitions via Enjoy API (FREE) - see `@/services/api/dictionary`
- **Smart Dictionary**: AI-powered contextual detailed analysis with context awareness (all providers) - see `@/services/ai/services/smart-dictionary`

### ASR (Speech-to-Text)

Whisper-based transcription with timestamped segments. Supports all three provider tiers.

### TTS (Text-to-Speech)

Text-to-speech conversion for shadowing practice. Uses Enjoy API, Local (Web Speech API), or BYOK providers.

### Pronunciation Assessment

Azure Speech Services only (requires phoneme-level assessment). Supports Enjoy mode (token-based) and BYOK mode (user's Azure subscription).

## BYOK (Bring Your Own Key)

BYOK allows users to use their own API keys for supported providers:

- **OpenAI**: GPT models, Whisper, TTS
- **Google (Gemini)**: Gemini models for translation and dictionary
- **Claude (Anthropic)**: Claude models for translation and dictionary
- **Azure**: Azure OpenAI Service, Azure Speech
- **Custom**: Any OpenAI-compatible endpoint

BYOK uses Vercel AI SDK for unified LLM access and official SDKs for speech services.

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
3. **Import from public API** (`@/services/ai`) for all service usage
4. **Let the router handle provider selection** - only override when necessary
5. **Handle errors consistently** using the standardized response format

## Technology Stack

- **Vercel AI SDK**: Unified LLM access for BYOK
- **transformers.js**: Browser-based local models
- **OpenAI SDK**: Direct API access for speech services
- **Azure Speech SDK**: Pronunciation assessment

## Conclusion

The AI Service architecture provides:

- **Unified Interface**: Consistent API across all services and providers
- **Flexible Routing**: Automatic provider selection with manual override capability
- **Consistent Quality**: Shared prompts ensure consistent output across providers
- **Extensibility**: Easy to add new providers or services
- **User Choice**: Multiple tiers from free local models to premium cloud services
