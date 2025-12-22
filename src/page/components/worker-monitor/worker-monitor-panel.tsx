/**
 * Worker Monitor Panel
 * Displays standardized status for all Web Workers in the application
 */

import { useWorkerStatusStore, type StandardWorkerStatus, type WorkerType } from '@/page/stores/worker-status'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Badge } from '@/page/components/ui/badge'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
// No external date library needed - using native Date API

// ============================================================================
// Worker Status Badge
// ============================================================================

function WorkerStatusBadge({ status }: { status: StandardWorkerStatus['status'] }) {
  const { t } = useTranslation()

  const statusConfig: Record<
    StandardWorkerStatus['status'],
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: string; label: string }
  > = {
    idle: {
      variant: 'secondary',
      icon: 'lucide:circle',
      label: t('worker.status.idle', { defaultValue: 'Idle' }),
    },
    initializing: {
      variant: 'secondary',
      icon: 'lucide:loader-2',
      label: t('worker.status.initializing', { defaultValue: 'Initializing' }),
    },
    ready: {
      variant: 'default',
      icon: 'lucide:check-circle-2',
      label: t('worker.status.ready', { defaultValue: 'Ready' }),
    },
    running: {
      variant: 'default',
      icon: 'lucide:play-circle',
      label: t('worker.status.running', { defaultValue: 'Running' }),
    },
    error: {
      variant: 'destructive',
      icon: 'lucide:alert-circle',
      label: t('worker.status.error', { defaultValue: 'Error' }),
    },
    terminated: {
      variant: 'outline',
      icon: 'lucide:x-circle',
      label: t('worker.status.terminated', { defaultValue: 'Terminated' }),
    },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="gap-1">
      {status === 'initializing' || status === 'running' ? (
        <Icon icon={config.icon} className="h-3 w-3 animate-spin" />
      ) : (
        <Icon icon={config.icon} className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Worker Card
// ============================================================================

function WorkerCard({ worker }: { worker: StandardWorkerStatus }) {
  const { t } = useTranslation()

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return t('worker.never', { defaultValue: 'Never' })
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{worker.workerName}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {worker.workerId} • {worker.workerType}
            </CardDescription>
          </div>
          <WorkerStatusBadge status={worker.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error Display */}
        {worker.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2">
            <div className="flex items-start gap-2">
              <Icon icon="lucide:alert-circle" className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">{worker.error}</p>
                {worker.errorDetails?.stack && (
                  <details className="mt-1">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      {t('worker.showDetails', { defaultValue: 'Show details' })}
                    </summary>
                    <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {worker.errorDetails.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {worker.progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{worker.progress.message || t('worker.progress', { defaultValue: 'Progress' })}</span>
              <span>{Math.round(worker.progress.percentage)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, worker.progress.percentage))}%` }}
              />
            </div>
          </div>
        )}

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

        {/* Timestamps */}
        <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
          <div className="flex justify-between">
            <span>{t('worker.created', { defaultValue: 'Created' })}:</span>
            <span>{formatTime(worker.createdAt)}</span>
          </div>
          {worker.initializedAt && (
            <div className="flex justify-between">
              <span>{t('worker.initialized', { defaultValue: 'Initialized' })}:</span>
              <span>{formatTime(worker.initializedAt)}</span>
            </div>
          )}
          {worker.lastActivityAt && (
            <div className="flex justify-between">
              <span>{t('worker.lastActivity', { defaultValue: 'Last activity' })}:</span>
              <span>{formatTime(worker.lastActivityAt)}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        {worker.metadata && Object.keys(worker.metadata).length > 0 && (
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer">
              {t('worker.metadata', { defaultValue: 'Metadata' })}
            </summary>
            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(worker.metadata, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Panel
// ============================================================================

export function WorkerMonitorPanel() {
  const { t } = useTranslation()

  // Subscribe to workers Map and create a serialized key for comparison
  // This prevents infinite loops by only updating when content actually changes
  const workersSerialized = useWorkerStatusStore((state) => {
    const workersArray = Array.from(state.workers.values())
    // Create a stable serialized key that only changes when actual content changes
    return JSON.stringify(
      workersArray.map((w) => ({
        id: w.workerId,
        status: w.status,
        activeTasks: w.activeTasks,
        completedTasks: w.completedTasks,
        failedTasks: w.failedTasks,
        lastActivityAt: w.lastActivityAt,
        error: w.error,
      }))
    )
  })

  // Get workers array only when serialized key changes
  const workers = useMemo(() => {
    return Array.from(useWorkerStatusStore.getState().workers.values())
  }, [workersSerialized])

  // Memoize the grouping to prevent recalculation on every render
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
        <h2 className="text-2xl font-semibold mb-2">
          {t('worker.monitor.title', { defaultValue: 'Worker Monitor' })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('worker.monitor.description', {
            defaultValue: 'Monitor the status of all Web Workers in the application',
          })}
        </p>
      </div>

      {Object.entries(workersByType).map(([type, typeWorkers]) => (
        <div key={type} className="space-y-3">
          <h3 className="text-lg font-medium capitalize">{type.replace('-', ' ')}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {typeWorkers.map((worker) => (
              <WorkerCard key={worker.workerId} worker={worker} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

