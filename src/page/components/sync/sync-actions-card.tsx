/**
 * Sync Actions Card - Provides buttons to trigger sync operations
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Button } from '@/page/components/ui/button'
import { useTriggerSync } from '@/page/hooks/queries/use-sync-queries'
import { RefreshCw, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SyncActionsCard() {
  const { t } = useTranslation()
  const triggerSync = useTriggerSync()

  const handleSync = async (force: boolean = false) => {
    try {
      const result = await triggerSync.mutateAsync({ force })
      if (result.success) {
        toast.success(
          t('sync.actions.syncSuccess', {
            defaultValue: 'Sync completed: {{synced}} synced, {{failed}} failed',
            synced: result.synced,
            failed: result.failed,
          })
        )
      } else {
        toast.error(
          t('sync.actions.syncError', {
            defaultValue: 'Sync completed with {{failed}} errors',
            failed: result.failed,
          })
        )
      }
    } catch (error) {
      toast.error(
        t('sync.actions.syncFailed', {
          defaultValue: 'Sync failed',
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  const isSyncing = triggerSync.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sync.actions.title', { defaultValue: 'Sync Actions' })}</CardTitle>
        <CardDescription>
          {t('sync.actions.description', { defaultValue: 'Manually trigger synchronization' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleSync(false)}
            disabled={isSyncing}
            className="flex-1"
            size="lg"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('sync.actions.syncing', { defaultValue: 'Syncing...' })}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('sync.actions.syncNow', { defaultValue: 'Sync Now' })}
              </>
            )}
          </Button>

          <Button
            onClick={() => handleSync(true)}
            disabled={isSyncing}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('sync.actions.forceSync', { defaultValue: 'Force Sync' })}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('sync.actions.forceSyncHint', {
            defaultValue: 'Force sync will download all records, ignoring incremental sync',
          })}
        </p>
      </CardContent>
    </Card>
  )
}

