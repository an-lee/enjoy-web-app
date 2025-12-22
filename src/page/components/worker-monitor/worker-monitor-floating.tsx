/**
 * Worker Monitor Floating Window
 * A floating window in the bottom-right corner that shows worker status
 * Similar to a chat window - minimized shows status indicator, expanded shows full list
 */

import { useState, useMemo } from 'react'
import { useWorkerStatusStore, type StandardWorkerStatus, type WorkerType } from '@/page/stores/worker-status'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/page/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// Status Indicator (Minimized View)
// ============================================================================

function StatusIndicator({ workers }: { workers: StandardWorkerStatus[] }) {
  // Determine overall status
  const hasRunning = workers.some((w) => w.status === 'running' || w.status === 'initializing')
  const hasError = workers.some((w) => w.status === 'error')
  const hasActiveTasks = workers.some((w) => w.activeTasks > 0)

  // Status priority: error > running > active tasks > ready
  const statusColor = hasError
    ? 'bg-red-500'
    : hasRunning
    ? 'bg-green-500'
    : hasActiveTasks
    ? 'bg-yellow-500'
    : 'bg-gray-400'

  const statusPulse = hasRunning || hasActiveTasks ? 'animate-pulse' : ''

  return (
    <div className="relative">
      <div className={cn('w-3 h-3 rounded-full', statusColor, statusPulse)} />
      {(hasRunning || hasActiveTasks) && (
        <div className={cn('absolute inset-0 rounded-full', statusColor, 'animate-ping opacity-75')} />
      )}
    </div>
  )
}

// ============================================================================
// Worker Item (Compact View)
// ============================================================================

function WorkerItem({ worker }: { worker: StandardWorkerStatus }) {
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

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

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={cn('w-2 h-2 rounded-full shrink-0', getStatusColor(worker.status).replace('text-', 'bg-'))} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{worker.workerName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {worker.activeTasks > 0 && `${worker.activeTasks} active`}
            {worker.error && ' • Error'}
            {worker.lastActivityAt && ` • ${formatTime(worker.lastActivityAt)}`}
          </p>
        </div>
      </div>
      {worker.progress && (
        <div className="shrink-0 text-xs text-muted-foreground">
          {Math.round(worker.progress.percentage)}%
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Floating Window Component
// ============================================================================

export function WorkerMonitorFloating() {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Subscribe to workers with serialized key to prevent infinite loops
  const workersSerialized = useWorkerStatusStore((state) => {
    const workersArray = Array.from(state.workers.values())
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

  // Group workers by type
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

  // Don't show if no workers (but allow showing if there are workers even if not active)
  // This allows users to see worker status even when idle

  // Calculate overall status
  const hasRunning = workers.some((w) => w.status === 'running' || w.status === 'initializing')
  const hasError = workers.some((w) => w.status === 'error')
  const hasActiveTasks = workers.some((w) => w.activeTasks > 0)
  const shouldShowIndicator = hasRunning || hasActiveTasks || hasError

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded View */}
      {isExpanded && (
        <Card className="w-80 shadow-2xl border bg-background/95 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIndicator workers={workers} />
                <CardTitle className="text-base">
                  {t('worker.monitor.title', { defaultValue: 'Worker Monitor' })}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(false)}
              >
                <Icon icon="lucide:chevron-down" className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs mt-1">
              {workers.length} {t('worker.monitor.workers', { defaultValue: 'workers' })}
              {hasActiveTasks && ` • ${workers.reduce((sum, w) => sum + w.activeTasks, 0)} active`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-2 space-y-1">
                {Object.entries(workersByType).map(([type, typeWorkers]) => (
                  <div key={type} className="space-y-1">
                    {Object.keys(workersByType).length > 1 && (
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {type.replace('-', ' ')}
                      </div>
                    )}
                    {typeWorkers.map((worker) => (
                      <WorkerItem key={worker.workerId} worker={worker} />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Minimized Button - Shows green light when workers are active */}
      <Button
        variant="default"
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-2xl',
          'hover:scale-110 transition-all duration-200',
          'bg-background border-2',
          shouldShowIndicator && 'ring-2 ring-offset-2 ring-offset-background',
          hasError && 'ring-red-500 border-red-500/50',
          hasRunning && 'ring-green-500 border-green-500/50',
          hasActiveTasks && !hasRunning && 'ring-yellow-500 border-yellow-500/50'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        title={t('worker.monitor.toggle', { defaultValue: 'Toggle Worker Monitor' })}
      >
        <div className="relative flex items-center justify-center">
          <Icon
            icon="lucide:activity"
            className={cn(
              'h-6 w-6 transition-colors',
              hasRunning ? 'text-green-500' : hasError ? 'text-red-500' : hasActiveTasks ? 'text-yellow-500' : 'text-muted-foreground'
            )}
          />
          {/* Green light indicator when workers are running */}
          {shouldShowIndicator && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                hasError ? 'bg-red-400' : hasRunning ? 'bg-green-400' : 'bg-yellow-400'
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-3.5 w-3.5',
                hasError ? 'bg-red-500' : hasRunning ? 'bg-green-500' : 'bg-yellow-500'
              )} />
            </span>
          )}
        </div>
      </Button>
    </div>
  )
}

