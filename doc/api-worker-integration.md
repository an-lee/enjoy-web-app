# Hono API Worker Integration Guide

## Overview

The project has successfully integrated Hono as the API layer, coexisting with TanStack Start SSR in the same Cloudflare Worker.

**Responsibility Separation**:
- **Rails API**: User information management (authentication, user profiles, data synchronization)
- **Hono API Worker**: All AI services (translation, dictionary, ASR, TTS, assessment)

> **Related Documentation**:
> - [System Architecture](./architecture.md) - Overall architecture overview
> - [API Services](./api-services.md) - Rails API and Hono API responsibility separation
> - [AI Service Architecture](./ai-services.md) - AI service architecture details

## Architecture

```
Request → Cloudflare Worker
  ├─ /api/* → Hono API Handler
  ├─ Static Assets → Workers Assets (dist/client/)
  └─ Page Requests → TanStack Start SSR Handler
```

## File Structure

```
src/
├── server/
│   ├── index.ts      # Custom server-entry, request routing
│   └── api.ts        # Hono API route definitions
└── ...
```

## Configuration

### wrangler.jsonc

```jsonc
{
  "main": "./src/server/index.ts",  // Custom server-entry
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]  // API routes handled by Worker first
  }
}
```

### Route Priority

1. **`/api/*`** → Hono API Handler
2. **Static Assets** → Workers Assets
3. **Other Requests** → TanStack Start SSR

## AI Service Implementation

Hono API Worker handles all AI services. Below are implementation examples for major AI service endpoints:

### Translation Services

- **Fast Translation** (`POST /api/translation/fast`): Uses Cloudflare Workers AI M2M100 model
- **Smart Translation** (`POST /api/translation/smart`): Uses LLM for style-aware translation

### Dictionary Services

- **Basic Dictionary** (`POST /api/dictionary/basic`): Simple word lookup with KV caching support
- **Smart Dictionary** (`POST /api/dictionary/smart`): Context-aware AI dictionary explanations

### Speech Services

- **ASR** (`POST /api/asr`): Automatic Speech Recognition using Whisper model
- **TTS** (`POST /api/tts`): Text-to-Speech
- **Assessment** (`POST /api/assessment`): Pronunciation evaluation

Refer to the example code in `src/server/api.ts` for detailed implementation.

## Usage Examples

### Adding New API Routes

Add routes in `src/server/api.ts`:

```typescript
import { Hono } from 'hono'

const api = new Hono<{ Bindings: Env }>()

// GET request
api.get('/users', async (c) => {
  const users = await getUsers()
  return c.json({ users })
})

// POST request
api.post('/users', async (c) => {
  const body = await c.req.json()
  const user = await createUser(body)
  return c.json({ user }, 201)
})

// Route with parameters
api.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await getUserById(id)
  if (!user) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ user })
})
```

### Using Cloudflare Bindings

```typescript
// Access KV
api.get('/data/:key', async (c) => {
  const key = c.req.param('key')
  const value = await c.env.MY_KV.get(key)
  return c.json({ key, value })
})

// Access D1 database
api.get('/posts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM posts LIMIT 10'
  ).all()
  return c.json({ posts: results })
})

// Use AI Binding
api.post('/translate', async (c) => {
  const { text } = await c.req.json()
  const response = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
    text: [text],
    source_lang: 'en',
    target_lang: 'zh',
  })
  return c.json({ translation: response })
})
```

### Middleware Examples

```typescript
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Add CORS middleware
api.use('/*', cors())

// Add logging middleware
api.use('/*', logger())

// Custom authentication middleware
const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  // Verify token...
  await next()
}

api.use('/protected/*', authMiddleware)
```

### Error Handling

```typescript
// Global error handler
api.onError((err, c) => {
  console.error(`${err}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 404 handler
api.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})
```

## Frontend Usage Examples

```typescript
// Call API in React component
const fetchData = async () => {
  const response = await fetch('/api/users')
  const data = await response.json()
  return data
}

// Using TanStack Query
import { useQuery } from '@tanstack/react-query'

function UsersList() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      return res.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  return <div>{/* render users */}</div>
}
```

## Configuring Cloudflare Bindings

Add Bindings in `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    { "binding": "MY_KV", "id": "your-kv-namespace-id" }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-db",
      "database_id": "your-db-id"
    }
  ],
  "ai": {
    "binding": "AI"
  },
  "r2_buckets": [
    { "binding": "MY_BUCKET", "bucket_name": "my-bucket" }
  ]
}
```

Then run `bun run cf-typegen` to update type definitions.

## Development Workflow

### Local Development

```bash
bun run dev
```

Access:
- API: `http://localhost:3000/api/health`
- Pages: `http://localhost:3000/`

### Build and Deploy

```bash
# Build
bun run build

# Preview (test build output locally)
bun run preview

# Deploy to Cloudflare
bun run deploy
```

## Best Practices

1. **Route Organization**: Group related routes in separate files
   ```typescript
   // src/server/api/users.ts
   export const usersApi = new Hono()
   usersApi.get('/', ...)
   usersApi.post('/', ...)

   // src/server/api.ts
   import { usersApi } from './api/users'
   api.route('/users', usersApi)
   ```

2. **Type Safety**: Use Zod for request validation
   ```typescript
   import { zValidator } from '@hono/zod-validator'
   import { z } from 'zod'

   const createUserSchema = z.object({
     name: z.string(),
     email: z.string().email(),
   })

   api.post('/users', zValidator('json', createUserSchema), async (c) => {
     const { name, email } = c.req.valid('json')
     // ...
   })
   ```

3. **Error Handling**: Unified error response format
   ```typescript
   api.onError((err, c) => {
     if (err instanceof ValidationError) {
       return c.json({ error: err.message }, 400)
     }
     return c.json({ error: 'Internal Server Error' }, 500)
   })
   ```

4. **Performance Optimization**: Use caching and rate limiting
   ```typescript
   import { cache } from 'hono/cache'

   api.get('/data', cache({
     cacheName: 'my-cache',
     cacheControl: 'max-age=3600',
   }), async (c) => {
     // ...
   })
   ```

## Troubleshooting

### API Routes Not Working

1. Check if `main` in `wrangler.jsonc` points to `./src/server/index.ts`
2. Verify that `run_worker_first` includes `["/api/*"]`
3. Check if server files are included in build output

### Type Errors

Run `bun run cf-typegen` to update type definitions.

### Static Assets Not Loading

Verify that `assets.directory` points to the correct build output directory (usually `./dist/client`).

## Reference Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TanStack Start Documentation](https://tanstack.com/start/latest)
