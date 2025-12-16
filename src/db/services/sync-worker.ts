/**
 * Sync Worker - Handles sync operations in a Web Worker to avoid blocking main thread
 *
 * Note: IndexedDB operations must happen on the main thread, so this worker
 * only handles network requests. Database operations are done via postMessage.
 */

// Worker context
let workerContext: Worker | null = null

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
    workerContext = createSyncWorker()
  }
  return workerContext
}

/**
 * Terminate sync worker
 */
export function terminateSyncWorker(): void {
  if (workerContext) {
    workerContext.terminate()
    workerContext = null
  }
}

// ============================================================================
// Worker Communication
// ============================================================================

/**
 * Send message to sync worker and wait for response
 */
function sendToWorker(message: SyncWorkerMessage): Promise<SyncWorkerResponse> {
  return new Promise((resolve, reject) => {
    const worker = getSyncWorker()
    const messageId = `${Date.now()}-${Math.random()}`

    const handler = (e: MessageEvent<SyncWorkerResponse>) => {
      if (e.data.id === messageId) {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'error') {
          reject(new Error(e.data.error || 'Unknown error'))
        } else {
          resolve(e.data)
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

