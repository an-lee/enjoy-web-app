/**
 * Upload Actions Card - Provides buttons to trigger upload operations
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUploadSync } from '@/hooks/queries/use-sync-queries'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function UploadActionsCard() {
  const { t } = useTranslation()
  const uploadSync = useUploadSync()

  const handleUpload = async () => {
    try {
      const result = await uploadSync.mutateAsync({ background: false })
      if (result.success) {
        toast.success(
          t('sync.upload.actions.success', {
            defaultValue: 'Upload completed: {{synced}} synced, {{failed}} failed',
            synced: result.synced,
            failed: result.failed,
          })
        )
      } else {
        toast.error(
          t('sync.upload.actions.error', {
            defaultValue: 'Upload completed with {{failed}} errors',
            failed: result.failed,
          })
        )
      }
    } catch (error) {
      toast.error(
        t('sync.upload.actions.failed', {
          defaultValue: 'Upload failed',
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  const isUploading = uploadSync.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('sync.upload.actions.title', { defaultValue: 'Upload' })}
        </CardTitle>
        <CardDescription>
          {t('sync.upload.actions.description', { defaultValue: 'Upload local changes to server' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sync.upload.actions.uploading', { defaultValue: 'Uploading...' })}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t('sync.upload.actions.uploadNow', { defaultValue: 'Upload Now' })}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

