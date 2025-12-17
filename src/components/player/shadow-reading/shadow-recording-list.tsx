/**
 * ShadowRecordingList Component
 *
 * Displays a list of existing shadow reading recordings for a specific echo region.
 * Handles data fetching, selection, and integrates with RecordingPlayer for playback.
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RecordingPlayer } from './recording-player'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Check if all required props are available
  const hasRequiredProps =
    !!targetType && !!targetId && !!language && startTime != null && endTime != null

  // Query recordings for this echo region
  // IMPORTANT: Hooks must be called unconditionally at the top level
  // Use the `enabled` option to control whether the query actually runs
  const { recordings, isLoading } = useRecordingsByEchoRegion({
    targetType: targetType ?? 'Audio',
    targetId: targetId ?? '',
    language: language ?? '',
    startTime: startTime ?? 0,
    endTime: endTime ?? 0,
    enabled: enabled && hasRequiredProps,
  })

  // Get selected recording
  const selectedRecording = useMemo(() => {
    if (recordings.length === 0) return null
    // Ensure index is valid
    const index = selectedIndex >= recordings.length ? 0 : selectedIndex
    return recordings[index]
  }, [recordings, selectedIndex])

  // Handle selection change
  const handleSelectionChange = (recordingId: string) => {
    const index = recordings.findIndex((r) => r.id === recordingId)
    if (index >= 0) {
      setSelectedIndex(index)
    }
  }

  // Don't render if required props missing, loading, or no recordings
  if (!hasRequiredProps || isLoading || recordings.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {t('player.transcript.existingRecordings', {
              defaultValue: 'Existing Recordings',
            })}
          </span>

          {/* Recording Selection Dropdown - only show if multiple recordings */}
          {recordings.length > 1 && selectedRecording && (
            <Select
              value={selectedRecording.id}
              onValueChange={handleSelectionChange}
            >
              <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
                <SelectValue>
                  {t('player.transcript.recordingNumber', {
                    number: recordings.length - selectedIndex,
                    defaultValue: `Recording ${recordings.length - selectedIndex}`,
                  })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {recordings.map((recording, index) => {
                  const dateStr = recording.createdAt
                    ? new Date(recording.createdAt).toLocaleDateString()
                    : ''
                  // Display number in reverse order (newest = highest number)
                  const displayNumber = recordings.length - index
                  return (
                    <SelectItem key={recording.id} value={recording.id}>
                      {t('player.transcript.recordingNumber', {
                        number: displayNumber,
                        defaultValue: `Recording ${displayNumber}`,
                      })}
                      {dateStr && ` (${dateStr})`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Recording Player */}
        {selectedRecording && <RecordingPlayer recording={selectedRecording} />}
      </div>
    </div>
  )
}
