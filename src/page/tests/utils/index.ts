/**
 * Central export for all test utilities
 */

export * from './render'

// Re-export test setup utilities
export { waitForAsync, createDeferred } from '../setup'

// Re-export mocks
export * from '../mocks'

// ============================================================================
// Common Test Helpers
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (!(await condition())) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded')
    }
    await wait(interval)
  }
}

/**
 * Create a spy function with type-safe mocking
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): T & { calls: Parameters<T>[]; reset: () => void } {
  const calls: Parameters<T>[] = []

  const spy = ((...args: Parameters<T>) => {
    calls.push(args)
    return implementation?.(...args)
  }) as T & { calls: Parameters<T>[]; reset: () => void }

  spy.calls = calls
  spy.reset = () => {
    calls.length = 0
  }

  return spy
}

/**
 * Assert that a value is defined (non-null and non-undefined)
 */
export function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be defined')
  }
}

/**
 * Generate a random string for test data
 */
export function randomString(length: number = 8): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
}

/**
 * Generate a random number within a range
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Deep clone an object (useful for creating test data variations)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Create a mock blob for file testing
 */
export function createMockBlob(
  content: string = 'test content',
  type: string = 'text/plain'
): Blob {
  return new Blob([content], { type })
}

/**
 * Create a mock audio blob
 */
export function createMockAudioBlob(): Blob {
  // Create a minimal valid WAV file header
  const sampleRate = 44100
  const numChannels = 1
  const bitsPerSample = 16
  const numSamples = sampleRate // 1 second of audio
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const fileSize = 36 + dataSize

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, fileSize, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Audio data (silence)
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Create a mock File object
 */
export function createMockFile(
  name: string = 'test.txt',
  content: string = 'test content',
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

