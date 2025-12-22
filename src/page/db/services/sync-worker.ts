/**
 * Sync Worker - Handles sync operations in a Web Worker to avoid blocking main thread
 *
 * Note: IndexedDB operations must happen on the main thread, so this worker
 * only handles network requests. Database operations are done via postMessage.
 */

import { useWorkerStatusStore } from '@/page/stores/worker-status'

// Worker context
let workerContext: Worker | null = null
const WORKER_ID = 'sync-worker'
const WORKER_NAME = 'Sync Worker'

// ============================================================================
// Types
// ============================================================================

export interface SyncWorkerMessage {
  type: 'sync' | 'download' | 'upload'
  entityType?: 'audio' | 'video'
  payload?: unknown
  id?: string
}

export interface SyncWorkerResponse {
  type: 'success' | 'error' | 'progress'
  id?: string
  data?: unknown
  error?: string
  progress?: {
    current: number
    total: number
  }
}

// ============================================================================
// Worker Creation
// ============================================================================

/**
 * Create sync worker (inline worker to avoid separate file)
 */
function createSyncWorker(): Worker {
  // Create an inline worker using Blob URL
  const workerCode = `
    // Sync Worker - Handles network requests for sync operations

    self.onmessage = async function(e) {
      const { type, entityType, payload, id } = e.data;

      try {
        switch (type) {
          case 'download':
            // Download from server
            const response = await fetch(payload.url, {
              method: 'GET',
              headers: payload.headers || {},
            });

            if (!response.ok) {
              throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }

            const data = await response.json();

            self.postMessage({
              type: 'success',
              id,
              data,
            });
            break;

          case 'upload':
            // Upload to server
            const uploadResponse = await fetch(payload.url, {
              method: payload.method || 'POST',
              headers: payload.headers || {},
              body: JSON.stringify(payload.body),
            });

            if (!uploadResponse.ok) {
              throw new Error(\`HTTP \${uploadResponse.status}: \${uploadResponse.statusText}\`);
            }

            const uploadData = await uploadResponse.json();

            self.postMessage({
              type: 'success',
              id,
              data: uploadData,
            });
            break;

          default:
            throw new Error(\`Unknown sync type: \${type}\`);
        }
      } catch (error) {
        self.postMessage({
          type: 'error',
          id,
          error: error.message || String(error),
        });
      }
    };
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

/**
 * Get or create sync worker
 */
function getSyncWorker(): Worker {
  if (!workerContext) {
    const store = useWorkerStatusStore.getState()

    // Register worker in status store
    store.registerWorker(WORKER_ID, WORKER_NAME, 'sync')
    store.updateWorkerStatus(WORKER_ID, 'initializing')

    try {
      workerContext = createSyncWorker()

      workerContext.addEventListener('error', (error) => {
        const store = useWorkerStatusStore.getState()
        store.updateWorkerError(WORKER_ID, 'Worker error occurred', {
          message: error.message || 'Worker error occurred',
        })
      })

      workerContext.addEventListener('messageerror', () => {
        const store = useWorkerStatusStore.getState()
        store.updateWorkerError(WORKER_ID, 'Worker message error', {
          message: 'Failed to deserialize message',
        })
      })

      store.updateWorkerStatus(WORKER_ID, 'ready')
    } catch (error) {
      const store = useWorkerStatusStore.getState()
      store.updateWorkerStatus(WORKER_ID, 'error')
      store.updateWorkerError(WORKER_ID, error instanceof Error ? error.message : 'Failed to initialize worker', {
        message: error instanceof Error ? error.message : 'Failed to initialize worker',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }
  return workerContext
}

/**
 * Terminate sync worker
 */
export function terminateSyncWorker(): void {
  const store = useWorkerStatusStore.getState()

  if (workerContext) {
    workerContext.terminate()
    workerContext = null
  }

  store.updateWorkerStatus(WORKER_ID, 'terminated')
}

// ============================================================================
// Worker Communication
// ============================================================================

/**
 * Send message to sync worker and wait for response
 */
function sendToWorker(message: SyncWorkerMessage): Promise<SyncWorkerResponse> {
  const store = useWorkerStatusStore.getState()
  store.updateWorkerStatus(WORKER_ID, 'running')
  store.incrementTask(WORKER_ID, 'active')

  return new Promise((resolve, reject) => {
    const worker = getSyncWorker()
    const messageId = `${Date.now()}-${Math.random()}`

    const handler = (e: MessageEvent<SyncWorkerResponse>) => {
      if (e.data.id === messageId) {
        worker.removeEventListener('message', handler)

        if (e.data.type === 'error') {
          store.incrementTask(WORKER_ID, 'failed')
          store.updateWorkerError(WORKER_ID, e.data.error || 'Unknown error')
          reject(new Error(e.data.error || 'Unknown error'))
        } else {
          store.incrementTask(WORKER_ID, 'completed')
          resolve(e.data)
        }

        // Update status to ready if no active tasks
        const currentStatus = store.getWorkerStatus(WORKER_ID)
        if (currentStatus && currentStatus.activeTasks === 0) {
          store.updateWorkerStatus(WORKER_ID, 'ready')
        }
      }
    }

    worker.addEventListener('message', handler)
    worker.postMessage({ ...message, id: messageId })
  })
}

/**
 * Download data via worker
 */
export async function downloadViaWorker(
  url: string,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const response = await sendToWorker({
    type: 'download',
    payload: { url, headers },
  })
  return response.data
}

/**
 * Upload data via worker
 */
export async function uploadViaWorker(
  url: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const response = await sendToWorker({
    type: 'upload',
    payload: { url, method, body, headers },
  })
  return response.data
}

