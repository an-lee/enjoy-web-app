/**
 * Download Actions Card - Provides buttons to trigger download operations
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Button } from '@/page/components/ui/button'
import { useDownloadSync } from '@/page/hooks/queries/use-sync-queries'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function DownloadActionsCard() {
  const { t } = useTranslation()
  const downloadSync = useDownloadSync()

  const handleDownload = async (force: boolean = false) => {
    try {
      const result = await downloadSync.mutateAsync({ force })
      if (result.success) {
        toast.success(
          t('sync.download.actions.success', {
            defaultValue: 'Download completed: {{synced}} synced, {{failed}} failed',
            synced: result.synced,
            failed: result.failed,
          })
        )
      } else {
        toast.error(
          t('sync.download.actions.error', {
            defaultValue: 'Download completed with {{failed}} errors',
            failed: result.failed,
          })
        )
      }
    } catch (error) {
      toast.error(
        t('sync.download.actions.failed', {
          defaultValue: 'Download failed',
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  const isDownloading = downloadSync.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t('sync.download.actions.title', { defaultValue: 'Download' })}
        </CardTitle>
        <CardDescription>
          {t('sync.download.actions.description', { defaultValue: 'Download updates from server' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleDownload(false)}
            disabled={isDownloading}
            className="flex-1"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('sync.download.actions.downloading', { defaultValue: 'Downloading...' })}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('sync.download.actions.downloadNow', { defaultValue: 'Download Now' })}
              </>
            )}
          </Button>

          <Button
            onClick={() => handleDownload(true)}
            disabled={isDownloading}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            {t('sync.download.actions.forceDownload', { defaultValue: 'Force Download' })}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('sync.download.actions.forceHint', {
            defaultValue: 'Force download will fetch all records, ignoring incremental sync',
          })}
        </p>
      </CardContent>
    </Card>
  )
}

