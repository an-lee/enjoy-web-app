# API & AI Services

## 1. Backend API (Rails)

The Rails API serves as the interface between the client and various AI providers. It handles authentication, rate limiting, and standardizing responses.

### Authentication

The web app uses OAuth authentication, which is initiated by the browser extension:
1. Extension opens webapp login page: `/login?state={state}&locale={locale}`
2. Webapp handles OAuth flow with backend
3. On success, webapp sends `ENJOY_ECHO_AUTH_SUCCESS` message to extension via `postMessage`
4. Extension validates token and stores it

**Auth Endpoints:**
-   `POST /api/v1/auth/oauth/callback`: OAuth callback handler (if needed)
-   `GET /api/v1/user/profile`: Get current user profile

### Key Endpoints

-   `POST /api/v1/materials`: Create metadata for new material.
-   `POST /api/v1/materials/:id/upload`: Get presigned URL for media upload.
-   `POST /api/v1/sync`: Batch synchronization endpoint for progress and vocabulary.

### AI Service Endpoints

-   `POST /api/v1/services/translation`: Smart translation with style support.
-   `POST /api/v1/services/tts`: Text-to-speech synthesis.
-   `POST /api/v1/services/asr`: Automatic speech recognition.
-   `POST /api/v1/services/dictionary`: Contextual word lookup.
-   `POST /api/v1/services/assessment`: Submit audio for pronunciation scoring.
-   `GET /api/v1/services/azure-speech/token`: Get Azure Speech token (for non-BYOK usage).

## 2. AI Service Integration

The backend acts as a proxy to hide keys and manage quotas. All AI services support multiple providers and BYOK (Bring Your Own Key) for future extensibility.

### Service Provider Modes

All AI services support three provider modes:

1. **`enjoy`** (default): Uses Enjoy API managed services with user quotas
2. **`local`**: Uses browser-local transformers.js models (free, offline-capable)
3. **`byok`**: Uses user-provided API keys (future implementation)

### A. Smart Translation

-   **Providers**:
    -   **Rails**: Cloudflare Workers AI or other LLM services
    -   **Local**: transformers.js translation models (limited features)
    -   **BYOK**: User's own OpenAI/Claude keys (future)
-   **Features**:
    -   Pre-defined translation styles: literal, natural, casual, formal, simplified, detailed
    -   Custom prompt support for advanced users
    -   Context-aware translation
-   **Request Format**:
    ```json
    {
      "sourceText": "Hello world",
      "sourceLanguage": "en",
      "targetLanguage": "zh",
      "style": "natural",
      "customPrompt": "optional custom prompt",
      "config": {
        "provider": "enjoy" | "local" | "byok"
      }
    }
    ```

### B. Text-to-Speech (TTS)

-   **Providers**:
    -   **Rails**: OpenAI-compatible API or Azure Speech (via token)
    -   **Azure Direct**: Azure Speech SDK with token from Rails API
    -   **BYOK**: User's own Azure/OpenAI keys (future)
-   **Features**:
    -   Multiple voice options
    -   Language-specific voices
    -   High-quality neural voices (Azure)
-   **Request Format**:
    ```json
    {
      "text": "Hello world",
      "language": "en",
      "voice": "optional voice name",
      "provider": "openai" | "azure",
      "config": {
        "provider": "enjoy" | "byok"
      }
    }
    ```

### C. Automatic Speech Recognition (ASR)

-   **Providers**:
    -   **Rails**: OpenAI-compatible API (Whisper) or Cloudflare Workers AI
    -   **Azure**: Azure Speech SDK with token from Rails API
    -   **Local**: transformers.js Whisper models (free users, offline)
    -   **BYOK**: User's own Azure/OpenAI keys (future)
-   **Features**:
    -   Multi-language support
    -   Timestamped segments
    -   Language detection
    -   Prompt-based context hints
-   **Request Format**:
    ```multipart/form-data
    audio: Blob
    language: string (optional)
    prompt: string (optional)
    provider: "openai" | "azure" | "local"
    config: JSON string
    ```

### D. Dictionary & Context (LLM)

-   **Providers**:
    -   **Rails**: Cloudflare Workers AI (Llama 3 or Mistral)
    -   **Local**: transformers.js small LLM models (may have limited capabilities)
    -   **BYOK**: User's own LLM API keys (future)
-   **Features**:
    -   Contextual word definitions
    -   Translation with context explanation
    -   Part-of-speech tagging
    -   Example sentences
-   **Prompt Strategy**:
    -   Input: Target word, Full sentence context, User's native language.
    -   Output: JSON containing definition, translation, and explanation of why this meaning fits the context.
-   **Caching**: Results are cached in Redis to prevent re-generation for identical context queries.

### E. Pronunciation Assessment

-   **Providers**:
    -   **Rails**: Azure Speech Services (via token)
    -   **BYOK**: User's own Azure Speech keys (future)
-   **Features**:
    -   Overall Score (0-100)
    -   Phoneme-level accuracy errors
    -   Fluency and Prosody scores
    -   Word-level detailed feedback
-   **Flow**:
    1.  Client records audio (WAV/WebM).
    2.  Uploads to Backend (or uses Azure SDK directly with BYOK).
    3.  Backend streams to Azure (or client calls Azure directly).
    4.  Returns detailed JSON report to client.
-   **Request Format**:
    ```multipart/form-data
    audio: Blob
    referenceText: string
    language: string
    config: JSON string (optional, for BYOK)
    ```

## 3. Azure Speech Token Management

For non-BYOK Azure Speech usage, clients obtain time-limited tokens from Rails API:

-   **Endpoint**: `GET /api/v1/services/azure-speech/token`
-   **Response**: `{ token: string, expiresAt: number }`
-   **Usage**: Client uses token with Azure Speech SDK directly (reduces latency vs. proxying through Rails)

## 4. Local Model Support

Free users can use browser-local models powered by `@huggingface/transformers`:

-   **ASR**: Whisper models (tiny/small variants)
-   **Translation**: M2M100 or similar translation models
-   **TTS**: Web Speech API or transformers.js TTS models
-   **Dictionary**: Small LLM models (if feasible)
-   **Assessment**: Not supported - requires Azure Speech Services for accurate phoneme-level analysis

Local models run in Web Workers to avoid blocking the UI. Model weights are cached in browser storage after first download.

**Note**: Pronunciation assessment does not support local mode as it requires specialized Azure Speech Services for accurate phoneme-level pronunciation scoring.

## 5. BYOK (Bring Your Own Key) - Future

The service interface is designed to support BYOK, allowing users to:

-   Provide their own API keys for OpenAI, Azure, etc.
-   Bypass quota limits (using their own quotas)
-   Use premium features without subscription

BYOK implementation is deferred but the interface is ready.

