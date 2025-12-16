/**
 * Sync Status Card - Shows overall sync manager status
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSyncStatus } from '@/hooks/queries/use-sync-queries'
import { Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react'

export function SyncStatusCard() {
  const { t } = useTranslation()
  const { data: status, isLoading } = useSyncStatus()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sync.status.title', { defaultValue: 'Sync Status' })}</CardTitle>
          <CardDescription>
            {t('sync.status.description', { defaultValue: 'Current synchronization status' })}
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

  const isOnline = status?.isOnline ?? navigator.onLine
  const isInitialized = status?.isInitialized ?? false
  const hasPeriodicSync = status?.hasPeriodicSync ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sync.status.title', { defaultValue: 'Sync Status' })}</CardTitle>
        <CardDescription>
          {t('sync.status.description', { defaultValue: 'Current synchronization status' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initialization Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t('sync.status.initialized', { defaultValue: 'Initialized' })}
            </span>
          </div>
          {isInitialized ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('sync.status.active', { defaultValue: 'Active' })}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {t('sync.status.inactive', { defaultValue: 'Inactive' })}
            </Badge>
          )}
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {t('sync.status.network', { defaultValue: 'Network' })}
            </span>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline
              ? t('sync.status.online', { defaultValue: 'Online' })
              : t('sync.status.offline', { defaultValue: 'Offline' })}
          </Badge>
        </div>

        {/* Periodic Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t('sync.status.periodicSync', { defaultValue: 'Periodic Sync' })}
            </span>
          </div>
          {hasPeriodicSync ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('sync.status.enabled', { defaultValue: 'Enabled' })}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {t('sync.status.disabled', { defaultValue: 'Disabled' })}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

