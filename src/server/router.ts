import { Hono } from 'hono'
import type { Context } from 'hono'
import { handleError } from './utils/errors'
import { azure } from './routes/azure'

// Env type is declared globally in worker-configuration.d.ts
// You can extend it in wrangler.jsonc when adding bindings

// Main API router
const router = new Hono<{
	Bindings: Env
}>()

// Global error handler
router.onError((err, c) => {
	return handleError(c, err)
})

// Health check endpoint (public)
router.get('/health', (c: Context<{ Bindings: Env }>) => {
	return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mount route handlers
router.route('/azure', azure)

// Example: Add more routes
// import { translation } from './routes/translation'
// router.route('/translation', translation)

export { router }
