/**
 * Upload Status Card - Shows upload sync status
 * Includes items in sync queue and local entities not yet in queue
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Badge } from '@/page/components/ui/badge'
import { useUploadStats } from '@/page/hooks/queries/use-sync-queries'
import { Loader2, Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export function UploadStatusCard() {
  const { t } = useTranslation()
  const { data: stats, isLoading } = useUploadStats()

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
        {/* Pending in Queue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {t('sync.upload.status.pendingInQueue', { defaultValue: 'Pending in Queue' })}
            </span>
          </div>
          <Badge variant={(stats?.pendingInQueue || 0) > 0 ? 'default' : 'secondary'}>
            {stats?.pendingInQueue || 0}
          </Badge>
        </div>

        {/* Failed in Queue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">
              {t('sync.upload.status.failedInQueue', { defaultValue: 'Failed in Queue' })}
            </span>
          </div>
          <Badge variant={(stats?.failedInQueue || 0) > 0 ? 'destructive' : 'secondary'}>
            {stats?.failedInQueue || 0}
          </Badge>
        </div>

        {/* Local Not in Queue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">
              {t('sync.upload.status.localNotInQueue', { defaultValue: 'Local (Not in Queue)' })}
            </span>
          </div>
          <Badge variant={(stats?.localNotInQueue || 0) > 0 ? 'outline' : 'secondary'}>
            {stats?.localNotInQueue || 0}
          </Badge>
        </div>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t('sync.upload.status.total', { defaultValue: 'Total' })}
            </span>
            <Badge variant={(stats?.total || 0) > 0 ? 'default' : 'secondary'}>
              {stats?.total || 0}
            </Badge>
          </div>
        </div>

        {(stats?.total || 0) === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t('sync.upload.status.upToDate', { defaultValue: 'All changes are synced' })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}


