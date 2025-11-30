# API & AI Services

## 1. Backend API (Rails) - Enjoy API

The Enjoy API is our project's cloud service backend. It serves as the interface between the client and various AI providers, following **OpenAI-compatible API specifications**. It handles authentication, rate limiting, quota management, and standardizing responses across different providers.

### Authentication

The web app uses OAuth authentication, which is initiated by the browser extension:
1. Extension opens webapp login page: `/login?state={state}&locale={locale}`
2. Webapp handles OAuth flow with backend
3. On success, webapp sends `ENJOY_ECHO_AUTH_SUCCESS` message to extension via `postMessage`
4. Extension validates token and stores it

**Auth Endpoints:**
- `POST /api/v1/auth/oauth/callback`: OAuth callback handler (if needed)
- `GET /api/v1/user/profile`: Get current user profile

### Key Endpoints

 - `POST /api/v1/materials`: Create metadata for new material.
 - `POST /api/v1/materials/:id/upload`: Get presigned URL for media upload.
 - `POST /api/v1/sync`: Batch synchronization endpoint for progress and vocabulary.

### AI Service Endpoints

- `POST /api/v1/services/translation`: Smart translation with style support.
- `POST /api/v1/services/tts`: Text-to-speech synthesis.
- `POST /api/v1/services/asr`: Automatic speech recognition.
- `POST /api/v1/services/dictionary`: Contextual word lookup.
- `POST /api/v1/services/assessment`: Submit audio for pronunciation scoring.
- `GET /api/v1/services/azure-speech/token`: Get Azure Speech token (for non-BYOK usage).

## 2. AI Service Integration

The Enjoy API follows **OpenAI-compatible specifications**, making it easy to integrate and switch between providers. It acts as a proxy to hide keys and manage quotas. All AI services support multiple providers and BYOK (Bring Your Own Key) for future extensibility.

### Service Provider Modes

All AI services support three provider modes:

1. **`enjoy`** (default): Uses Enjoy API managed services with user quotas
   - OpenAI-compatible API interface
   - Centralized authentication and quota management
   - Supports multiple backend providers (OpenAI, Cloudflare Workers AI, etc.)

2. **`local`**: Uses browser-local transformers.js models (free, offline-capable)
   - Runs entirely in browser using Web Workers
   - No API calls, completely offline
   - Uses the same prompt templates as cloud services

3. **`byok`**: Uses user-provided API keys (future implementation)
   - Planned support for: **OpenAI**, **Google (Gemini)**, **Claude (Anthropic)**, **Azure**, **Custom OpenAI-compatible endpoints**
   - Provider adapters handle API differences and convert to OpenAI format
   - Uses the same prompt templates as other providers

### A. Smart Translation

- **Providers**:
  - **Enjoy API**: OpenAI-compatible API using Cloudflare Workers AI or other LLM services
  - **Local**: transformers.js translation models (limited features)
  - **BYOK** (future): OpenAI, Google Gemini, Claude, Azure, or custom endpoints
- **Features**:
  - Pre-defined translation styles: literal, natural, casual, formal, simplified, detailed
  - Custom prompt support for advanced users
  - Context-aware translation
  - **Unified prompts**: Same prompt templates used across all providers (enjoy, local, byok)
- **Request Format**:

    ```json
    {
      "sourceText": "Hello world",
      "sourceLanguage": "en",
      "targetLanguage": "zh",
      "style": "natural",
      "customPrompt": "optional custom prompt",
      "config": {
        "provider": "enjoy" | "local" | "byok",
        "byok": {
          "provider": "openai" | "google" | "claude" | "azure" | "custom",
          "apiKey": "your-api-key",
          "endpoint": "optional-custom-endpoint",
          "model": "optional-model-name"
        }
      }
    }
    ```

### B. Text-to-Speech (TTS)

- **Providers**:
  - **Enjoy API**: OpenAI-compatible API or Azure Speech (via token)
  - **Azure Direct**: Azure Speech SDK with token from Enjoy API
  - **Local**: Web Speech API or transformers.js TTS models
  - **BYOK** (future): OpenAI, Azure Speech, or custom endpoints
- **Features**:
  - Multiple voice options
  - Language-specific voices
  - High-quality neural voices (Azure)
- **Request Format**:

    ```json
    {
      "text": "Hello world",
      "language": "en",
      "voice": "optional voice name",
      "provider": "openai" | "azure",
      "config": {
        "provider": "enjoy" | "local" | "byok",
        "byok": {
          "provider": "openai" | "azure",
          "apiKey": "your-api-key",
          "endpoint": "optional-custom-endpoint"
        }
      }
    }
    ```

### C. Automatic Speech Recognition (ASR)

- **Providers**:
  - **Enjoy API**: OpenAI-compatible API (Whisper) or Cloudflare Workers AI
  - **Azure**: Azure Speech SDK with token from Enjoy API
  - **Local**: transformers.js Whisper models (free users, offline)
  - **BYOK** (future): OpenAI, Azure Speech, or custom endpoints
- **Features**:
  - Multi-language support
  - Timestamped segments
  - Language detection
  - Prompt-based context hints
- **Request Format**:

    ```multipart/form-data
    audio: Blob
    language: string (optional)
    prompt: string (optional)
    provider: "openai" | "azure" | "local"
    config: JSON string {
      "provider": "enjoy" | "local" | "byok",
      "byok": {
        "provider": "openai" | "azure",
        "apiKey": "your-api-key"
      }
    }
    ```

### D. Dictionary & Context (LLM)

- **Providers**:
  - **Enjoy API**: OpenAI-compatible API using Cloudflare Workers AI (Llama 3 or Mistral)
  - **Local**: transformers.js small LLM models (may have limited capabilities)
  - **BYOK** (future): OpenAI, Google Gemini, Claude, Azure, or custom endpoints
- **Features**:
  - Contextual word definitions
  - Translation with context explanation
  - Part-of-speech tagging
  - Example sentences
  - **Unified prompts**: Same prompt templates used across all providers
- **Prompt Strategy**:
  - Input: Target word, Full sentence context, User's native language.
  - Output: JSON containing definition, translation, and explanation of why this meaning fits the context.
- **Caching**: Results are cached in Redis to prevent re-generation for identical context queries.

### E. Pronunciation Assessment

- **Providers**:
  - **Enjoy API**: Azure Speech Services (via token)
  - **BYOK** (future): User's own Azure Speech keys
  - **Note**: Only Azure Speech Services supports pronunciation assessment
- **Features**:
  - Overall Score (0-100)
  - Phoneme-level accuracy errors
  - Fluency and Prosody scores
  - Word-level detailed feedback
- **Flow**:
  1. Client records audio (WAV/WebM).
  2. Uploads to Enjoy API (or uses Azure SDK directly with BYOK).
  3. Backend streams to Azure (or client calls Azure directly).
  4. Returns detailed JSON report to client.
- **Request Format**:

  ```multipart/form-data
  audio: Blob
  referenceText: string
  language: string
  config: JSON string {
    "provider": "enjoy" | "byok",
    "byok": {
      "provider": "azure",
      "apiKey": "your-api-key",
      "region": "azure-region"
    }
  }
  ```

## 3. Azure Speech Token Management

For non-BYOK Azure Speech usage, clients obtain time-limited tokens from Enjoy API:

- **Endpoint**: `GET /api/v1/services/azure-speech/token`
- **Response**: `{ token: string, expiresAt: number }`
- **Usage**: Client uses token with Azure Speech SDK directly (reduces latency vs. proxying through Enjoy API)

## 4. Local Model Support

Free users can use browser-local models powered by `@huggingface/transformers`:

- **ASR**: Whisper models (tiny/small variants)
- **Translation**: M2M100 or similar translation models
- **TTS**: Web Speech API or transformers.js TTS models
- **Dictionary**: Small LLM models (if feasible)
- **Assessment**: Not supported - requires Azure Speech Services for accurate phoneme-level analysis

Local models run in Web Workers to avoid blocking the UI. Model weights are cached in browser storage after first download.

**Note**: Pronunciation assessment does not support local mode as it requires specialized Azure Speech Services for accurate phoneme-level pronunciation scoring.

## 5. BYOK (Bring Your Own Key) - Future Implementation

The service interface is designed to support BYOK, allowing users to:

- Provide their own API keys for multiple providers
- Bypass quota limits (using their own quotas)
- Use premium features without subscription
- Choose from multiple LLM providers based on preference

### Supported BYOK Providers (Planned)

1. **OpenAI**: GPT models, Whisper (ASR), TTS
2. **Google (Gemini)**: Gemini models for translation and dictionary
3. **Claude (Anthropic)**: Claude models for translation and dictionary
4. **Azure**: Azure OpenAI Service and Azure Speech Services
5. **Custom**: Any OpenAI-compatible endpoint

### Provider Adapters

All BYOK providers are accessed through **provider adapters** that convert their native APIs to OpenAI-compatible format. This ensures:

- Consistent interface across all providers
- Easy addition of new providers
- Same prompt templates work for all providers
- Unified error handling and response format

### Prompt Management

All prompts are **centrally managed** in `/src/services/ai/prompts/`:

- `translation-prompts.ts`: Prompts for smart translation with style support
- `dictionary-prompts.ts`: Prompts for contextual word lookup
- `language-utils.ts`: Language code mappings and utilities

These prompts are shared across:
- Enjoy API (cloud service)
- Local models (transformers.js)
- BYOK providers (OpenAI, Google, Claude, etc.)

This ensures consistent output quality regardless of provider.

## 6. Architecture Design Principles

### 6.1 Unified Interface

All AI services follow a consistent pattern:

```typescript
// Unified response format
interface AIServiceResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    serviceType: AIServiceType
    provider: AIProvider
    tokensUsed?: number
    cost?: number
  }
}
```

### 6.2 Provider Abstraction

The system uses a three-tier provider model:

1. **Enjoy API (Cloud)**:
   - OpenAI-compatible interface
   - Managed quotas and authentication
   - Backend can use any LLM provider (OpenAI, Cloudflare, etc.)

2. **Local Models**:
   - Browser-based using transformers.js
   - Web Worker isolation for performance
   - Same prompts as cloud services

3. **BYOK (Future)**:
   - Multiple provider support via adapters
   - OpenAI-compatible unified interface
   - Same prompts as other modes

### 6.3 Prompt Centralization

All prompts are managed in `/src/services/ai/prompts/`:

**Benefits**:
- Single source of truth for prompt templates
- Easy to update and maintain
- Consistent output across providers
- Supports A/B testing and optimization

**Structure**:
```
prompts/
├── index.ts              # Export all prompts
├── language-utils.ts     # Language mappings
├── translation-prompts.ts # Translation prompt templates
└── dictionary-prompts.ts  # Dictionary prompt templates
```

### 6.4 Provider Adapters (BYOK)

Provider adapters handle API differences and are located in `/src/services/ai/provider-adapters.ts`:

**Responsibilities**:
- Convert OpenAI format → Provider-specific format
- Convert Provider response → OpenAI format
- Handle authentication headers
- Construct correct endpoints

**Supported Providers**:
- **OpenAI**: Direct OpenAI API access
- **Google**: Gemini API → OpenAI format conversion
- **Claude**: Anthropic API → OpenAI format conversion
- **Azure**: Azure OpenAI Service
- **Custom**: Any OpenAI-compatible endpoint

**Example Flow**:
```
User Request → AI Service → Provider Adapter → External API
                    ↓              ↓                 ↓
              (OpenAI format) (Transform)   (Provider format)
                    ↑              ↑                 ↑
User Response ← AI Service ← Provider Adapter ← External API
```

### 6.5 Error Handling

Unified error codes across all services:

- `LOCAL_*_ERROR`: Local model failures
- `*_ERROR`: General service errors
- `BYOK_*_ERROR`: BYOK authentication/request errors (future)
- `QUOTA_EXCEEDED`: User quota exhausted
- `INVALID_API_KEY`: BYOK key validation failed (future)

### 6.6 Service Type Definitions

All type definitions are centralized in `/src/services/ai/types.ts`:

```typescript
// Provider types
type AIProvider = 'enjoy' | 'byok' | 'local'
type BYOKProvider = 'openai' | 'google' | 'claude' | 'azure' | 'custom'

// Service types
type AIServiceType = 'fastTranslation' | 'smartTranslation' | 'tts' | 'asr' | 'dictionary' | 'assessment'

// Configuration
interface AIServiceConfig {
  provider: AIProvider
  byok?: BYOKConfig       // For BYOK mode
  localModel?: LocalModelConfig  // For local mode
}
```

This ensures type safety and consistency across all services.

## 7. BYOK Implementation

### 7.1 Current Status

✅ **Implemented and Ready** (as of November 2025)

BYOK support has been fully implemented using **Vercel AI SDK** for unified LLM access and official SDKs for speech services.

### 7.2 Dependencies

```json
{
  "dependencies": {
    "ai": "^5.0.0",                    // Vercel AI SDK core
    "@ai-sdk/openai": "^2.0.0",        // OpenAI provider
    "@ai-sdk/anthropic": "^2.0.0",     // Anthropic (Claude) provider
    "@ai-sdk/google": "^2.0.0",        // Google (Gemini) provider
    "openai": "^6.0.0"                 // OpenAI SDK for speech services
  }
}
```

### 7.3 Usage Example

```typescript
// Smart Translation with OpenAI BYOK
const result = await smartTranslationService.translate({
  sourceText: 'Hello world',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  style: 'natural',
  config: {
    provider: 'byok',
    byok: {
      provider: 'openai',
      apiKey: 'sk-...your-key...',
      model: 'gpt-4',
    },
  },
})

// Dictionary Lookup with Claude BYOK
const dictResult = await dictionaryService.lookup({
  word: 'ephemeral',
  context: 'The beauty of this moment is ephemeral.',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  config: {
    provider: 'byok',
    byok: {
      provider: 'claude',
      apiKey: 'sk-ant-...your-key...',
      model: 'claude-3-sonnet-20240229',
    },
  },
})

// ASR with OpenAI BYOK
const asrResult = await asrService.transcribe({
  audioBlob: audioBlob,
  language: 'en',
  config: {
    provider: 'byok',
    byok: {
      provider: 'openai',
      apiKey: 'sk-...your-key...',
      model: 'whisper-1',
    },
  },
})
```

### 7.4 Service Implementation

BYOK services are located in `/src/services/ai/byok/`:

- **`llm-service.ts`**: Smart translation and dictionary using Vercel AI SDK
- **`speech-service.ts`**: ASR and TTS using OpenAI SDK

All BYOK providers use the **same centralized prompts** from `/src/services/ai/prompts/`, ensuring consistent output across different providers.

### 7.5 Provider Support Matrix

| Service | OpenAI | Claude | Gemini | Azure | Custom |
|---------|--------|--------|--------|-------|--------|
| Smart Translation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dictionary | ✅ | ✅ | ✅ | ✅ | ✅ |
| ASR | ✅ | ❌ | ❌ | ✅ | ✅ |
| TTS | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assessment | ❌ | ❌ | ❌ | ✅ | ❌ |

**Note**: Pronunciation assessment only supports Azure Speech Services.
