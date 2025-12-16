/**
 * Async Batch Processing Utilities
 *
 * Provides utilities for processing large batches of data without blocking the main thread
 */

// ============================================================================
// Types
// ============================================================================

export interface BatchProcessorOptions {
  /**
   * Batch size (items per batch)
   * @default 10
   */
  batchSize?: number
  /**
   * Delay between batches (ms)
   * @default 0
   */
  delay?: number
  /**
   * Use requestIdleCallback if available
   * @default true
   */
  useIdleCallback?: boolean
  /**
   * Timeout for idle callback (ms)
   * @default 1000
   */
  idleTimeout?: number
}

export interface BatchProcessorResult<T> {
  results: T[]
  errors: Error[]
  total: number
  processed: number
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process items in batches without blocking the main thread
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessorOptions = {}
): Promise<BatchProcessorResult<R>> {
  const {
    batchSize = 10,
    delay = 0,
    useIdleCallback = true,
    idleTimeout = 1000,
  } = options

  const results: R[] = []
  const errors: Error[] = []
  let processed = 0

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Wait for idle time if requested
    if (useIdleCallback && typeof requestIdleCallback !== 'undefined') {
      await new Promise<void>((resolve) => {
        requestIdleCallback(
          () => {
            processBatchSync(batch, processor, results, errors, i)
            processed += batch.length
            resolve()
          },
          { timeout: idleTimeout }
        )
      })
    } else {
      // Process synchronously
      await processBatchSync(batch, processor, results, errors, i)
      processed += batch.length
    }

    // Delay between batches if specified
    if (delay > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    results,
    errors,
    total: items.length,
    processed,
  }
}

/**
 * Process a single batch synchronously
 */
async function processBatchSync<T, R>(
  batch: T[],
  processor: (item: T, index: number) => Promise<R>,
  results: R[],
  errors: Error[],
  startIndex: number
): Promise<void> {
  const promises = batch.map((item, batchIndex) =>
    processor(item, startIndex + batchIndex).catch((error) => {
      errors.push(error instanceof Error ? error : new Error(String(error)))
      return null as R
    })
  )

  const batchResults = await Promise.all(promises)
  for (const result of batchResults) {
    if (result !== null) {
      results.push(result)
    }
  }
}

/**
 * Check if requestIdleCallback is available
 */
export function isIdleCallbackAvailable(): boolean {
  return typeof requestIdleCallback !== 'undefined'
}

/**
 * Wait for idle time
 */
export function waitForIdle(timeout: number = 1000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout })
    } else {
      // Fallback to setTimeout
      setTimeout(() => resolve(), 0)
    }
  })
}

