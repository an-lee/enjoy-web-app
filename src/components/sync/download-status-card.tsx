/**
 * Download Status Card - Shows download sync status
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLastSyncTimes } from '@/hooks/queries/use-sync-queries'
import { Loader2, Download, Clock } from 'lucide-react'

export function DownloadStatusCard() {
  const { t } = useTranslation()
  const { data: lastSyncTimes, isLoading } = useLastSyncTimes()

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) {
      return t('sync.download.status.never', { defaultValue: 'Never' })
    }
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSeconds < 60) {
        return t('sync.download.status.justNow', { defaultValue: 'Just now' })
      } else if (diffMinutes < 60) {
        return t('sync.download.status.minutesAgo', {
          defaultValue: '{{minutes}} minutes ago',
          minutes: diffMinutes,
        })
      } else if (diffHours < 24) {
        return t('sync.download.status.hoursAgo', {
          defaultValue: '{{hours}} hours ago',
          hours: diffHours,
        })
      } else if (diffDays < 7) {
        return t('sync.download.status.daysAgo', {
          defaultValue: '{{days}} days ago',
          days: diffDays,
        })
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return timestamp
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sync.download.status.title', { defaultValue: 'Download Status' })}</CardTitle>
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
          <Download className="h-5 w-5" />
          {t('sync.download.status.title', { defaultValue: 'Download Status' })}
        </CardTitle>
        <CardDescription>
          {t('sync.download.status.description', { defaultValue: 'Last download from server' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Last Download */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t('sync.download.status.audio', { defaultValue: 'Audio' })}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatTime(lastSyncTimes?.audio || null)}
          </span>
        </div>

        {/* Video Last Download */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t('sync.download.status.video', { defaultValue: 'Video' })}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatTime(lastSyncTimes?.video || null)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

