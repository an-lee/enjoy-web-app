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
-   `POST /api/v1/services/asr`: Request cloud ASR for a media file.
-   `POST /api/v1/services/dictionary`: Contextual word lookup.
-   `POST /api/v1/services/assessment`: Submit audio for pronunciation scoring.

## 2. AI Service Integration

The backend acts as a proxy to hide keys and manage quotas.

### A. Dictionary & Context (LLM)
-   **Provider**: Cloudflare Workers AI
-   **Model**: Llama 3 or Mistral (Subject to performance/cost).
-   **Prompt Strategy**:
    -   Input: Target word, Full sentence context, User's native language.
    -   Output: JSON containing definition, translation, and explanation of why this meaning fits the context.
-   **Caching**: Results are cached in Redis to prevent re-generation for identical context queries.

### B. Pronunciation Assessment
-   **Provider**: Azure Speech Services
-   **Features**:
    -   Overall Score (0-100)
    -   Phoneme-level accuracy errors.
    -   Fluency and Prosody scores.
-   **Flow**:
    1.  Client records audio (WAV/WebM).
    2.  Uploads to Backend.
    3.  Backend streams to Azure.
    4.  Returns detailed JSON report to client.

### C. Automatic Speech Recognition (ASR)
-   **Cloud**: Cloudflare Workers AI (Whisper). Used for "Pro" users or complex files.
-   **Local**: See `business_logic.md` for local ASR details.

### D. Text-to-Speech (TTS)
-   **Provider**: Azure Speech (Neural voices).
-   **Usage**: Generating audio for text-only articles or correcting user pronunciation.

