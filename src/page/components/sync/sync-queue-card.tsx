/**
 * Sync Queue Card - Shows pending and failed sync queue items
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Badge } from '@/page/components/ui/badge'
import { usePendingSyncQueue, useFailedSyncQueue } from '@/page/hooks/queries/use-sync-queries'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export function SyncQueueCard() {
  const { t } = useTranslation()
  const { data: pendingItems, isLoading: pendingLoading } = usePendingSyncQueue()
  const { data: failedItems, isLoading: failedLoading } = useFailedSyncQueue()

  const isLoading = pendingLoading || failedLoading
  const pendingCount = pendingItems?.length || 0
  const failedCount = failedItems?.length || 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sync.queue.title', { defaultValue: 'Sync Queue' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sync.queue.title', { defaultValue: 'Sync Queue' })}</CardTitle>
        <CardDescription>
          {t('sync.queue.description', { defaultValue: 'Pending and failed sync operations' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {t('sync.queue.pending', { defaultValue: 'Pending' })}
            </span>
          </div>
          <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
            {pendingCount}
          </Badge>
        </div>

        {/* Failed Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">
              {t('sync.queue.failed', { defaultValue: 'Failed' })}
            </span>
          </div>
          <Badge variant={failedCount > 0 ? 'destructive' : 'secondary'}>
            {failedCount}
          </Badge>
        </div>

        {pendingCount === 0 && failedCount === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t('sync.queue.empty', { defaultValue: 'No items in sync queue' })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

