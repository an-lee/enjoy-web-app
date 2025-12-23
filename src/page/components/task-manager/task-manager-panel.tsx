/**
 * Worker Monitor Panel
 * Displays all workers and their tasks with status, duration, and cancel functionality
 */

import { useWorkerStatusStore, type StandardWorkerStatus, type WorkerType, type WorkerTask, type TaskStatus } from '@/page/stores/worker-status'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Badge } from '@/page/components/ui/badge'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useMemo, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/page/components/ui/tabs'
import { ScrollArea } from '@/page/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// Task Status Badge
// ============================================================================

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation()

  const statusConfig: Record<
    TaskStatus,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: string; label: string }
  > = {
    pending: {
      variant: 'secondary',
      icon: 'lucide:clock',
      label: t('worker.task.pending', { defaultValue: 'Pending' }),
    },
    running: {
      variant: 'default',
      icon: 'lucide:play-circle',
      label: t('worker.task.running', { defaultValue: 'Running' }),
    },
    completed: {
      variant: 'default',
      icon: 'lucide:check-circle-2',
      label: t('worker.task.completed', { defaultValue: 'Completed' }),
    },
    failed: {
      variant: 'destructive',
      icon: 'lucide:x-circle',
      label: t('worker.task.failed', { defaultValue: 'Failed' }),
    },
    cancelled: {
      variant: 'outline',
      icon: 'lucide:stop-circle',
      label: t('worker.task.cancelled', { defaultValue: 'Cancelled' }),
    },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="gap-1">
      {status === 'running' ? (
        <Icon icon={config.icon} className="h-3 w-3 animate-spin" />
      ) : (
        <Icon icon={config.icon} className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Format Duration
// ============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// ============================================================================
// Task Item
// ============================================================================

function TaskItem({ task, workerId }: { task: WorkerTask; workerId: string }) {
  const { t } = useTranslation()
  const cancelTask = useWorkerStatusStore((state) => state.cancelTask)
  const [duration, setDuration] = useState(() => {
    if (task.completedAt || task.cancelledAt) {
      return (task.completedAt || task.cancelledAt || Date.now()) - task.startedAt
    }
    return Date.now() - task.startedAt
  })

  // Update duration for running tasks
  useEffect(() => {
    if (task.status === 'running' || task.status === 'pending') {
      const interval = setInterval(() => {
        setDuration(Date.now() - task.startedAt)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [task.status, task.startedAt])

  const handleCancel = () => {
    cancelTask(workerId, task.taskId)
  }

  const canCancel = task.status === 'pending' || task.status === 'running'

  return (
    <div className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TaskStatusBadge status={task.status} />
          <span className="text-xs font-mono text-muted-foreground truncate">{task.taskId}</span>
        </div>
        {task.error && (
          <p className="text-sm text-destructive mt-1">{task.error}</p>
        )}
        {task.metadata && Object.keys(task.metadata).length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {JSON.stringify(task.metadata)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">{formatDuration(duration)}</div>
          <div className="text-xs text-muted-foreground">
            {task.completedAt || task.cancelledAt
              ? t('worker.task.completedAt', { defaultValue: 'Completed' })
              : t('worker.task.runningFor', { defaultValue: 'Running' })}
          </div>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <Icon icon="lucide:x" className="h-4 w-4" />
            {t('worker.task.cancel', { defaultValue: 'Cancel' })}
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Worker Tasks List
// ============================================================================

function WorkerTasksList({ worker }: { worker: StandardWorkerStatus }) {
  const { t } = useTranslation()
  const tasks = Array.from(worker.tasks.values())

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending')
  const completedTasks = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  )

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t('worker.noTasks', { defaultValue: 'No tasks' })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">
            {t('worker.activeTasks', { defaultValue: 'Active Tasks' })} ({activeTasks.length})
          </h4>
          <div className="space-y-2">
            {activeTasks
              .sort((a, b) => b.startedAt - a.startedAt)
              .map((task) => (
                <TaskItem key={task.taskId} task={task} workerId={worker.workerId} />
              ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">
            {t('worker.completedTasks', { defaultValue: 'Completed Tasks' })} ({completedTasks.length})
          </h4>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {completedTasks
                .sort((a, b) => (b.completedAt || b.cancelledAt || 0) - (a.completedAt || a.cancelledAt || 0))
                .map((task) => (
                  <TaskItem key={task.taskId} task={task} workerId={worker.workerId} />
                ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Worker Card
// ============================================================================

function WorkerCard({ worker }: { worker: StandardWorkerStatus }) {
  const { t } = useTranslation()

  const getStatusColor = (status: StandardWorkerStatus['status']) => {
    switch (status) {
      case 'running':
      case 'initializing':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'ready':
        return 'text-blue-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const taskCount = worker.tasks.size

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{worker.workerName}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {worker.workerId} • {worker.workerType}
            </CardDescription>
          </div>
          <div className={cn('w-3 h-3 rounded-full shrink-0', getStatusColor(worker.status).replace('text-', 'bg-'))} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Statistics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">{t('worker.activeTasks', { defaultValue: 'Active' })}</span>
            <span className="font-medium">{worker.activeTasks}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">{t('worker.completedTasks', { defaultValue: 'Completed' })}</span>
            <span className="font-medium text-green-600 dark:text-green-400">{worker.completedTasks}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">{t('worker.failedTasks', { defaultValue: 'Failed' })}</span>
            <span className="font-medium text-destructive">{worker.failedTasks}</span>
          </div>
        </div>

        {/* Error Display */}
        {worker.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2">
            <div className="flex items-start gap-2">
              <Icon icon="lucide:alert-circle" className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">{worker.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {taskCount > 0 && (
          <div className="border-t pt-4">
            <WorkerTasksList worker={worker} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Panel
// ============================================================================

export function TaskManagerPanel() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('active')

  // Subscribe to workers and tasks
  const workersSerialized = useWorkerStatusStore((state) => {
    const workersArray = Array.from(state.workers.values())
    return JSON.stringify(
      workersArray.map((w) => ({
        id: w.workerId,
        status: w.status,
        activeTasks: w.activeTasks,
        taskCount: w.tasks.size,
      }))
    )
  })

  const workers = useMemo(() => {
    return Array.from(useWorkerStatusStore.getState().workers.values())
  }, [workersSerialized])

  const allTasks = useMemo(() => {
    const tasks: Array<{ task: WorkerTask; worker: StandardWorkerStatus }> = []
    for (const worker of workers) {
      for (const task of worker.tasks.values()) {
        tasks.push({ task, worker })
      }
    }
    return tasks.sort((a, b) => b.task.startedAt - a.task.startedAt)
  }, [workers])

  const activeTasks = useMemo(() => {
    return allTasks.filter(({ task }) => task.status === 'running' || task.status === 'pending')
  }, [allTasks])

  const workersByType = useMemo(() => {
    return workers.reduce(
      (acc, worker) => {
        if (!acc[worker.workerType]) {
          acc[worker.workerType] = []
        }
        acc[worker.workerType].push(worker)
        return acc
      },
      {} as Record<WorkerType, StandardWorkerStatus[]>
    )
  }, [workers])

  if (workers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Icon icon="lucide:info" className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('worker.noWorkers', { defaultValue: 'No workers registered' })}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {t('task.manager.title', { defaultValue: 'Task Manager' })}
        </h1>
        <p className="text-muted-foreground">
          {t('task.manager.description', {
            defaultValue: 'Monitor and manage all Web Workers and their tasks',
          })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'active')}>
        <TabsList>
          <TabsTrigger value="active">
            {t('worker.activeTasks', { defaultValue: 'Active Tasks' })} ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            {t('worker.allWorkers', { defaultValue: 'All Workers' })} ({workers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Icon icon="lucide:check-circle-2" className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('worker.noActiveTasks', { defaultValue: 'No active tasks' })}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeTasks.map(({ task, worker }) => (
                <TaskItem key={task.taskId} task={task} workerId={worker.workerId} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(workersByType).map(([type, typeWorkers]) => (
            <div key={type} className="space-y-3">
              <h3 className="text-lg font-medium capitalize">{type.replace(/-/g, ' ')}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeWorkers.map((worker) => (
                  <WorkerCard key={worker.workerId} worker={worker} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
