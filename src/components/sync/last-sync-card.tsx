/**
 * Last Sync Card - Shows last sync timestamps for each entity type
 */

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLastSyncTimes } from '@/hooks/queries/use-sync-queries'
import { Clock, Loader2 } from 'lucide-react'

export function LastSyncCard() {
  const { t } = useTranslation()
  const { data: lastSyncTimes, isLoading } = useLastSyncTimes()

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) {
      return t('sync.lastSync.never', { defaultValue: 'Never' })
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
        return t('sync.lastSync.justNow', { defaultValue: 'Just now' })
      } else if (diffMinutes < 60) {
        return t('sync.lastSync.minutesAgo', {
          defaultValue: '{{minutes}} minutes ago',
          minutes: diffMinutes,
        })
      } else if (diffHours < 24) {
        return t('sync.lastSync.hoursAgo', {
          defaultValue: '{{hours}} hours ago',
          hours: diffHours,
        })
      } else if (diffDays < 7) {
        return t('sync.lastSync.daysAgo', {
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
          <CardTitle>{t('sync.lastSync.title', { defaultValue: 'Last Sync' })}</CardTitle>
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
        <CardTitle>{t('sync.lastSync.title', { defaultValue: 'Last Sync' })}</CardTitle>
        <CardDescription>
          {t('sync.lastSync.description', { defaultValue: 'Last synchronization times' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t('sync.lastSync.audio', { defaultValue: 'Audio' })}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatTime(lastSyncTimes?.audio || null)}
          </span>
        </div>

        {/* Video Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t('sync.lastSync.video', { defaultValue: 'Video' })}
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

