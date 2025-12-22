/**
 * Audio Analysis Worker Manager
 * Manages Web Worker instances for audio decoding and analysis.
 * Provides a clean API for using workers with automatic fallback.
 */

import type { MonoPcmSegment } from '../segment'

// ============================================================================
// Types
// ============================================================================

interface DecodeTask {
  taskId: string
  resolve: (segment: MonoPcmSegment) => void
  reject: (error: Error) => void
}

// ============================================================================
// Worker Manager
// ============================================================================

class AudioAnalysisWorkerManager {
  private worker: Worker | null = null
  private tasks = new Map<string, DecodeTask>()
  private taskIdCounter = 0
  private isWebCodecsSupported: boolean | null = null

  /**
   * Initialize the worker
   */
  async init(): Promise<void> {
    if (this.worker) return

    // Check WebCodecs support
    this.checkWebCodecsSupport()

    // Create worker using the same pattern as other workers in the project
    this.worker = new Worker(
      new URL('./audio-analysis-worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (event) => {
      const response = event.data
      const task = this.tasks.get(response.taskId)

      if (!task) {
        console.warn(`[AudioAnalysisWorkerManager] Unknown task ID: ${response.taskId}`)
        return
      }

      this.tasks.delete(response.taskId)

      if (response.type === 'result') {
        task.resolve(response.data)
      } else if (response.type === 'error') {
        task.reject(new Error(response.error || 'Unknown error'))
      }
    }

    this.worker.onerror = (error) => {
      console.error('[AudioAnalysisWorkerManager] Worker error:', error)
      // Reject all pending tasks
      for (const task of this.tasks.values()) {
        task.reject(new Error('Worker error occurred'))
      }
      this.tasks.clear()
    }
  }

  /**
   * Check if WebCodecs is supported
   */
  private checkWebCodecsSupport(): void {
    if (this.isWebCodecsSupported !== null) return

    this.isWebCodecsSupported =
      typeof window !== 'undefined' &&
      'AudioDecoder' in window &&
      typeof (window as any).AudioDecoder === 'function'
  }

  /**
   * Decode audio blob to segment using worker
   */
  async decodeAudio(
    blob: Blob,
    startTimeSeconds: number,
    endTimeSeconds: number
  ): Promise<MonoPcmSegment> {
    if (!this.worker) {
      await this.init()
    }

    if (!this.worker) {
      throw new Error('Failed to initialize audio analysis worker')
    }

    const taskId = `task-${++this.taskIdCounter}`

    return new Promise<MonoPcmSegment>((resolve, reject) => {
      this.tasks.set(taskId, { taskId, resolve, reject })

      // Send decode message
      this.worker!.postMessage({
        type: 'decode',
        taskId,
        blob,
        startTimeSeconds,
        endTimeSeconds,
        useWebCodecs: this.isWebCodecsSupported ?? false,
      })
    })
  }

  /**
   * Check if WebCodecs is supported
   */
  getWebCodecsSupported(): boolean {
    if (this.isWebCodecsSupported === null) {
      this.checkWebCodecsSupport()
    }
    return this.isWebCodecsSupported ?? false
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.tasks.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let workerManagerInstance: AudioAnalysisWorkerManager | null = null

/**
 * Get the singleton worker manager instance
 */
export function getAudioAnalysisWorkerManager(): AudioAnalysisWorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new AudioAnalysisWorkerManager()
  }
  return workerManagerInstance
}

/**
 * Check if WebCodecs is supported in the current browser
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'AudioDecoder' in window &&
    typeof (window as any).AudioDecoder === 'function'
  )
}

