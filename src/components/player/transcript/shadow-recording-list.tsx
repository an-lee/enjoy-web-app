/**
 * ShadowRecordingList Component
 *
 * Displays a list of existing shadow reading recordings for a specific echo region.
 * Handles data fetching and integrates with RecordingPlayer for playback.
 */

import { useTranslation } from 'react-i18next'
import { RecordingPlayer } from './recording-player'
import { useRecordingsByEchoRegion } from '@/hooks/queries'
import type { TargetType } from '@/types/db'

interface ShadowRecordingListProps {
  /** Type of target (Audio or Video) */
  targetType: TargetType | null
  /** ID of the target media */
  targetId: string | null
  /** Language code */
  language: string | null
  /** Echo region start time in milliseconds */
  startTime: number | null
  /** Echo region end time in milliseconds */
  endTime: number | null
  /** Whether to enable data fetching (disabled during recording) */
  enabled?: boolean
  /** Optional CSS class name */
  className?: string
}

export function ShadowRecordingList({
  targetType,
  targetId,
  language,
  startTime,
  endTime,
  enabled = true,
  className,
}: ShadowRecordingListProps) {
  const { t } = useTranslation()
  if (!targetType || !targetId || !language || !startTime || !endTime) {
    return null
  }

  // Query recordings for this echo region
  const { recordings, isLoading } = useRecordingsByEchoRegion({
    targetType,
    targetId,
    language,
    startTime,
    endTime,
    enabled,
  })

  // Don't render anything if no recordings or loading
  if (isLoading || recordings.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          {t('player.transcript.existingRecordings', {
            defaultValue: 'Existing Recordings',
          })}
        </div>
        <RecordingPlayer recordings={recordings} />
      </div>
    </div>
  )
}

