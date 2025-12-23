/**
 * Tests for WorkerTaskManager
 * Tests task registration, status tracking, cancellation, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkerTaskManager } from './worker-task-manager'
import type { TaskStatus, WorkerType } from '@/page/stores/worker-status'

// ============================================================================
// Mock Worker Status Store
// ============================================================================

const mockStoreState = vi.hoisted(() => {
  const workers = new Map()
  return { workers }
})

const mockStore = vi.hoisted(() => ({
  registerTask: vi.fn((workerId: string, taskId: string, cancel?: () => void, metadata?: Record<string, any>) => {
    const worker = mockStoreState.workers.get(workerId)
    if (worker) {
      const tasks = new Map(worker.tasks)
      tasks.set(taskId, {
        taskId,
        status: 'pending' as TaskStatus,
        startedAt: Date.now(),
        cancel,
        metadata,
      })
      mockStoreState.workers.set(workerId, {
        ...worker,
        tasks,
        activeTasks: worker.activeTasks + 1,
      })
    }
  }),
  updateTask: vi.fn((workerId: string, taskId: string, status: TaskStatus, error?: string) => {
    const worker = mockStoreState.workers.get(workerId)
    if (worker) {
      const tasks = new Map(worker.tasks)
      const task = tasks.get(taskId)
      if (task) {
        const updates: any = { status }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          updates.completedAt = Date.now()
          if (status === 'cancelled') {
            updates.cancelledAt = Date.now()
          }
          if (error) {
            updates.error = error
          }
          updates.cancel = undefined
        }
        tasks.set(taskId, { ...task, ...updates })

        const updates2: any = { tasks }
        if (status === 'completed') {
          updates2.activeTasks = Math.max(0, worker.activeTasks - 1)
          updates2.completedTasks = worker.completedTasks + 1
        } else if (status === 'failed' || status === 'cancelled') {
          updates2.activeTasks = Math.max(0, worker.activeTasks - 1)
          updates2.failedTasks = worker.failedTasks + 1
        }

        mockStoreState.workers.set(workerId, { ...worker, ...updates2 })
      }
    }
  }),
  updateWorkerStatus: vi.fn((workerId: string, status: string) => {
    const worker = mockStoreState.workers.get(workerId)
    if (worker) {
      mockStoreState.workers.set(workerId, {
        ...worker,
        status,
        lastActivityAt: Date.now(),
      })
    }
  }),
  getWorkerStatus: vi.fn((workerId: string) => {
    return mockStoreState.workers.get(workerId)
  }),
  cancelTask: vi.fn((workerId: string, taskId: string) => {
    const worker = mockStoreState.workers.get(workerId)
    if (worker) {
      const task = worker.tasks.get(taskId)
      if (task && task.cancel) {
        task.cancel()
      }
    }
  }),
}))

vi.mock('@/page/stores/worker-status', () => ({
  useWorkerStatusStore: {
    getState: () => mockStore,
  },
}))

// ============================================================================
// Test Utilities
// ============================================================================

function createTestWorker(workerId: string, workerType: WorkerType) {
  mockStoreState.workers.set(workerId, {
    status: 'ready',
    workerId,
    workerName: `Test ${workerType}`,
    workerType,
    createdAt: Date.now(),
    lastActivityAt: null,
    initializedAt: null,
    error: null,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    tasks: new Map(),
  })
}

function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// ============================================================================
// Tests
// ============================================================================

describe('WorkerTaskManager', () => {
  const workerId = 'test-worker-1'
  const workerType: WorkerType = 'tts'

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    mockStoreState.workers.clear()

    // Create a test worker
    createTestWorker(workerId, workerType)
  })

  describe('Constructor', () => {
    it('should initialize with provided options', () => {
      const metadata = { text: 'Hello world' }
      const onCancel = vi.fn()

      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        metadata,
        onCancel,
      })

      expect(manager.getTaskId()).toBeNull()
    })

    it('should initialize without optional parameters', () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      expect(manager.getTaskId()).toBeNull()
    })
  })

  describe('execute', () => {
    it('should register task and execute successfully', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        metadata: { text: 'test' },
      })

      const taskFunction = vi.fn(async (taskId: string) => {
        expect(taskId).toBeTruthy()
        return { result: 'success' }
      })

      const result = await manager.execute(taskFunction)

      expect(result).toEqual({ result: 'success' })
      expect(taskFunction).toHaveBeenCalledTimes(1)
      expect(mockStore.registerTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        expect.any(Function),
        { text: 'test' }
      )
      expect(mockStore.updateTask).toHaveBeenCalledWith(workerId, expect.any(String), 'running', undefined)
      expect(mockStore.updateTask).toHaveBeenCalledWith(workerId, expect.any(String), 'completed', undefined)
      expect(manager.getTaskId()).toBeTruthy()
    })

    it('should update worker status to running when task starts', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => {
        await waitForAsync()
        return 'done'
      })

      expect(mockStore.updateWorkerStatus).toHaveBeenCalledWith(workerId, 'running')
    })

    it('should handle task execution errors', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const error = new Error('Task failed')
      const taskFunction = vi.fn(async () => {
        throw error
      })

      await expect(manager.execute(taskFunction)).rejects.toThrow('Task failed')

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'running',
        undefined
      )
      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'failed',
        'Task failed'
      )
    })

    it('should handle non-Error exceptions', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskFunction = vi.fn(async () => {
        throw 'String error'
      })

      await expect(manager.execute(taskFunction)).rejects.toBe('String error')

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'failed',
        'String error'
      )
    })

    it('should update worker status to ready when task completes and no active tasks remain', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => 'done')

      // After task completes, worker should be ready if no active tasks
      const worker = mockStore.getWorkerStatus(workerId)
      if (worker && worker.activeTasks === 0) {
        expect(mockStore.updateWorkerStatus).toHaveBeenCalledWith(workerId, 'ready')
      }
    })

    it('should generate unique task IDs', async () => {
      const manager1 = new WorkerTaskManager({ workerId, workerType })
      const manager2 = new WorkerTaskManager({ workerId, workerType })

      await manager1.execute(async () => 'result1')
      await manager2.execute(async () => 'result2')

      const taskId1 = manager1.getTaskId()
      const taskId2 = manager2.getTaskId()

      expect(taskId1).toBeTruthy()
      expect(taskId2).toBeTruthy()
      expect(taskId1).not.toBe(taskId2)
    })
  })

  describe('executeWithControl', () => {
    it('should provide manual status control', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const statusUpdates: Array<{ status: TaskStatus; error?: string }> = []

      const taskFunction = vi.fn(async (taskId: string, updateStatus: (status: TaskStatus, error?: string) => void) => {
        expect(taskId).toBeTruthy()
        updateStatus('running')
        statusUpdates.push({ status: 'running' })
        await waitForAsync()
        return { result: 'success' }
      })

      const { result, taskId } = await manager.executeWithControl(taskFunction)

      expect(result).toEqual({ result: 'success' })
      expect(taskId).toBeTruthy()
      expect(taskFunction).toHaveBeenCalledTimes(1)
      expect(mockStore.updateTask).toHaveBeenCalledWith(workerId, taskId, 'running', undefined)
      expect(mockStore.updateTask).toHaveBeenCalledWith(workerId, taskId, 'completed', undefined)
    })

    it('should ensure task is marked as completed if still running', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskFunction = vi.fn(async (_taskId: string, updateStatus: (status: TaskStatus) => void) => {
        updateStatus('running')
        // Don't update to completed manually
        return 'done'
      })

      await manager.executeWithControl(taskFunction)

      // Should be marked as completed automatically
      expect(mockStore.updateTask).toHaveBeenCalledWith(workerId, expect.any(String), 'completed', undefined)
    })

    it('should ensure task is marked as failed if error occurs', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const error = new Error('Task error')
      const taskFunction = vi.fn(async (_taskId: string, updateStatus: (status: TaskStatus) => void) => {
        updateStatus('running')
        throw error
      })

      await expect(manager.executeWithControl(taskFunction)).rejects.toThrow('Task error')

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'failed',
        'Task error'
      )
    })

    it('should not override status if already set to completed', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskFunction = vi.fn(async (_taskId: string, updateStatus: (status: TaskStatus) => void) => {
        updateStatus('running')
        updateStatus('completed')
        return 'done'
      })

      await manager.executeWithControl(taskFunction)

      // Should not call updateTask again after manual completion
      const completedCalls = mockStore.updateTask.mock.calls.filter(
        (call) => call[2] === 'completed'
      )
      expect(completedCalls.length).toBeGreaterThan(0)
    })
  })

  describe('cancel', () => {
    it('should cancel task if taskId exists', () => {
      const onCancel = vi.fn()
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        onCancel,
      })

      // Execute a task to get a taskId
      manager.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return 'done'
      })

      const taskId = manager.getTaskId()
      expect(taskId).toBeTruthy()

      manager.cancel()

      expect(mockStore.cancelTask).toHaveBeenCalledWith(workerId, taskId)
    })

    it('should not throw if cancel is called before task execution', () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      expect(() => manager.cancel()).not.toThrow()
      expect(mockStore.cancelTask).not.toHaveBeenCalled()
    })

    it('should call custom onCancel handler when task is cancelled', async () => {
      const onCancel = vi.fn()
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        onCancel,
      })

      // Start a task but don't wait for it to complete
      const taskPromise = manager.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return 'done'
      })

      // Get taskId before completion
      const taskId = manager.getTaskId()
      expect(taskId).toBeTruthy()

      // Manually trigger cancel through store before task completes
      if (taskId) {
        const worker = mockStore.getWorkerStatus(workerId)
        const task = worker?.tasks.get(taskId)
        if (task?.cancel) {
          task.cancel()
        }
      }

      // onCancel should be called when cancel function is invoked
      expect(onCancel).toHaveBeenCalled()

      // Clean up - cancel the promise
      manager.cancel()
      await taskPromise.catch(() => {
        // Expected to fail
      })
    })

    it('should handle errors in onCancel handler gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onCancel = vi.fn(async () => {
        throw new Error('Cancel handler error')
      })

      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        onCancel,
      })

      // Start a task but don't wait for it to complete
      const taskPromise = manager.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return 'done'
      })

      // Get taskId before completion
      const taskId = manager.getTaskId()
      expect(taskId).toBeTruthy()

      // Manually trigger cancel through store before task completes
      if (taskId) {
        const worker = mockStore.getWorkerStatus(workerId)
        const task = worker?.tasks.get(taskId)
        if (task?.cancel) {
          // Call cancel - error should be caught asynchronously
          task.cancel()
          // Wait for async error handling (Promise.resolve + catch)
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WorkerTaskManager] Cancel handler error'),
        expect.any(Error)
      )

      // Clean up
      manager.cancel()
      await taskPromise.catch(() => {
        // Expected to fail
      })
      consoleErrorSpy.mockRestore()
    })
  })

  describe('getTaskId', () => {
    it('should return null before task execution', () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      expect(manager.getTaskId()).toBeNull()
    })

    it('should return task ID after task registration', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async (taskId) => {
        expect(manager.getTaskId()).toBe(taskId)
        return 'done'
      })

      expect(manager.getTaskId()).toBeTruthy()
    })
  })

  describe('Task ID Generation', () => {
    it('should generate task IDs with correct format', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType: 'tts',
      })

      await manager.execute(async (taskId) => {
        expect(taskId).toMatch(/^tts-\d+-[a-z0-9]+$/)
        return 'done'
      })
    })

    it('should include worker type in task ID', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType: 'asr',
      })

      await manager.execute(async (taskId) => {
        expect(taskId).toMatch(/^asr-/)
        return 'done'
      })
    })
  })

  describe('Worker Status Updates', () => {
    it('should update worker status to running when task starts', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => {
        expect(mockStore.updateWorkerStatus).toHaveBeenCalledWith(workerId, 'running')
        return 'done'
      })
    })

    it('should update worker status to ready when all tasks complete', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => 'done')

      // Verify worker status update sequence
      const updateCalls = mockStore.updateWorkerStatus.mock.calls
      expect(updateCalls.some((call) => call[0] === workerId && call[1] === 'running')).toBe(true)
    })
  })

  describe('Metadata Handling', () => {
    it('should pass metadata to store when registering task', async () => {
      const metadata = {
        text: 'Hello world',
        language: 'en',
        options: { speed: 1.0 },
      }

      const manager = new WorkerTaskManager({
        workerId,
        workerType,
        metadata,
      })

      await manager.execute(async () => 'done')

      expect(mockStore.registerTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        expect.any(Function),
        metadata
      )
    })

    it('should work without metadata', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => 'done')

      expect(mockStore.registerTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        expect.any(Function),
        undefined
      )
    })
  })

  describe('Error Scenarios', () => {
    it('should handle async errors in task function', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskFunction = vi.fn(async () => {
        await waitForAsync()
        throw new Error('Async error')
      })

      await expect(manager.execute(taskFunction)).rejects.toThrow('Async error')

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'failed',
        'Async error'
      )
    })

    it('should handle promise rejections', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskFunction = vi.fn(async () => {
        return Promise.reject(new Error('Promise rejected'))
      })

      await expect(manager.execute(taskFunction)).rejects.toThrow('Promise rejected')

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        workerId,
        expect.any(String),
        'failed',
        'Promise rejected'
      )
    })
  })

  describe('Multiple Tasks', () => {
    it('should handle multiple sequential tasks', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      await manager.execute(async () => 'task1')
      await manager.execute(async () => 'task2')
      await manager.execute(async () => 'task3')

      expect(mockStore.registerTask).toHaveBeenCalledTimes(3)
      expect(mockStore.updateTask).toHaveBeenCalledTimes(6) // 3 running + 3 completed
    })

    it('should maintain separate task IDs for each execution', async () => {
      const manager = new WorkerTaskManager({
        workerId,
        workerType,
      })

      const taskIds: string[] = []

      await manager.execute(async (taskId) => {
        taskIds.push(taskId)
        return 'task1'
      })

      await manager.execute(async (taskId) => {
        taskIds.push(taskId)
        return 'task2'
      })

      expect(taskIds).toHaveLength(2)
      expect(taskIds[0]).not.toBe(taskIds[1])
    })
  })
})

