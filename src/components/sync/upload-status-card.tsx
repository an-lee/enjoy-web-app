/**
 * Upload Status Card - Shows upload sync status
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePendingSyncQueue, useFailedSyncQueue } from '@/hooks/queries/use-sync-queries'
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

export function UploadStatusCard() {
  const { t } = useTranslation()
  const { data: pendingItems, isLoading: pendingLoading } = usePendingSyncQueue()
  const { data: failedItems, isLoading: failedLoading } = useFailedSyncQueue()

  const isLoading = pendingLoading || failedLoading
  const pendingCount = pendingItems?.length || 0
  const failedCount = failedItems?.filter(
    (item) => item.entityType === 'audio' || item.entityType === 'video'
  ).length || 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sync.upload.status.title', { defaultValue: 'Upload Status' })}</CardTitle>
          <CardDescription>
            {t('sync.upload.status.description', { defaultValue: 'Local changes waiting to be uploaded' })}
          </CardDescription>
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
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('sync.upload.status.title', { defaultValue: 'Upload Status' })}
        </CardTitle>
        <CardDescription>
          {t('sync.upload.status.description', { defaultValue: 'Local changes waiting to be uploaded' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {t('sync.upload.status.pending', { defaultValue: 'Pending' })}
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
              {t('sync.upload.status.failed', { defaultValue: 'Failed' })}
            </span>
          </div>
          <Badge variant={failedCount > 0 ? 'destructive' : 'secondary'}>
            {failedCount}
          </Badge>
        </div>

        {pendingCount === 0 && failedCount === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t('sync.upload.status.upToDate', { defaultValue: 'All changes are synced' })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

