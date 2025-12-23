/**
 * Worker Task Manager
 * Standardized class for managing worker tasks with automatic registration,
 * status tracking, and cancellation support
 *
 * This is a generic utility that can be used by any worker service in the application.
 */

import { useWorkerStatusStore, type TaskStatus, type WorkerType } from '@/page/stores/worker-status'

// ============================================================================
// Types
// ============================================================================

export interface TaskManagerOptions {
  workerId: string
  workerType: WorkerType
  metadata?: Record<string, any>
  onCancel?: () => void | Promise<void> // Custom cancel handler
}

export interface TaskResult<T> {
  success: true
  data: T
}

export interface TaskError {
  success: false
  error: string
}

export type TaskResponse<T> = TaskResult<T> | TaskError

// ============================================================================
// Task Manager Class
// ============================================================================

/**
 * Standardized task manager for worker operations
 *
 * This class provides a unified way to manage worker tasks across the application,
 * handling registration, status tracking, and cancellation automatically.
 *
 * @example
 * ```typescript
 * const taskManager = new WorkerTaskManager({
 *   workerId: 'tts-worker',
 *   workerType: 'tts',
 *   metadata: { text: 'Hello world' },
 *   onCancel: () => {
 *     worker.postMessage({ type: 'cancel', data: { taskId: taskManager.getTaskId() } })
 *   }
 * })
 *
 * try {
 *   const result = await taskManager.execute(async (taskId) => {
 *     // Your task logic here
 *     return await doWork(taskId)
 *   })
 * } catch (error) {
 *   // Error handling (task automatically marked as failed)
 * }
 * ```
 */
export class WorkerTaskManager {
  private workerId: string
  private workerType: WorkerType
  private metadata?: Record<string, any>
  private onCancel?: () => void | Promise<void>
  private taskId: string | null = null
  private store = useWorkerStatusStore.getState()

  constructor(options: TaskManagerOptions) {
    this.workerId = options.workerId
    this.workerType = options.workerType
    this.metadata = options.metadata
    this.onCancel = options.onCancel
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `${this.workerType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Register the task in the store
   */
  private registerTask(): string {
    const taskId = this.generateTaskId()
    this.taskId = taskId

    // Create cancel function that calls custom handler if provided
    const cancel = () => {
      if (this.onCancel) {
        Promise.resolve(this.onCancel()).catch((error) => {
          console.error(`[WorkerTaskManager] Cancel handler error for ${this.workerId}:`, error)
        })
      }
    }

    this.store.registerTask(this.workerId, taskId, cancel, this.metadata)
    return taskId
  }

  /**
   * Update task status
   */
  private updateTaskStatus(status: TaskStatus, error?: string): void {
    if (!this.taskId) return

    this.store.updateTask(this.workerId, this.taskId, status, error)

    // Update worker status based on task status
    if (status === 'running') {
      this.store.updateWorkerStatus(this.workerId, 'running')
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      // Check if there are any active tasks left
      const worker = this.store.getWorkerStatus(this.workerId)
      if (worker && worker.activeTasks === 0) {
        this.store.updateWorkerStatus(this.workerId, 'ready')
      }
    }
  }

  /**
   * Execute a task with automatic registration and status tracking
   *
   * @param taskFunction - Async function that performs the actual work
   * @returns Promise with task result
   */
  async execute<T>(taskFunction: (taskId: string) => Promise<T>): Promise<T> {
    // Register task
    const taskId = this.registerTask()

    try {
      // Update status to running
      this.updateTaskStatus('running')

      // Execute the task
      const result = await taskFunction(taskId)

      // Mark as completed
      this.updateTaskStatus('completed')

      return result
    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.updateTaskStatus('failed', errorMessage)
      throw error
    }
  }

  /**
   * Execute a task with manual status control
   * Useful when you need fine-grained control over status updates
   *
   * @param taskFunction - Async function that performs the actual work
   * @returns Promise with task result and taskId
   */
  async executeWithControl<T>(
    taskFunction: (taskId: string, updateStatus: (status: TaskStatus, error?: string) => void) => Promise<T>
  ): Promise<{ result: T; taskId: string }> {
    // Register task
    const taskId = this.registerTask()

    try {
      // Update status callback
      const updateStatus = (status: TaskStatus, error?: string) => {
        this.updateTaskStatus(status, error)
      }

      // Execute the task with status update callback
      const result = await taskFunction(taskId, updateStatus)

      // Ensure task is marked as completed if not already
      const worker = this.store.getWorkerStatus(this.workerId)
      const task = worker?.tasks.get(taskId)
      if (task && (task.status === 'running' || task.status === 'pending')) {
        this.updateTaskStatus('completed')
      }

      return { result, taskId }
    } catch (error) {
      // Ensure task is marked as failed if not already
      const worker = this.store.getWorkerStatus(this.workerId)
      const task = worker?.tasks.get(taskId)
      if (task && (task.status === 'running' || task.status === 'pending')) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.updateTaskStatus('failed', errorMessage)
      }
      throw error
    }
  }

  /**
   * Cancel the current task
   */
  cancel(): void {
    if (this.taskId) {
      this.store.cancelTask(this.workerId, this.taskId)
    }
  }

  /**
   * Get the current task ID
   */
  getTaskId(): string | null {
    return this.taskId
  }
}

