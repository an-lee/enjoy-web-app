/**
 * TranscriptProgressIndicator Component
 *
 * Progress indicator for transcription process.
 */

import { Icon } from '@iconify/react'
import { Progress } from '@/page/components/ui/progress'

interface TranscriptProgressIndicatorProps {
  progress: string | null
  progressPercent: number | null
}

export function TranscriptProgressIndicator({
  progress,
  progressPercent,
}: TranscriptProgressIndicatorProps) {
  if (progressPercent === null) {
    return null
  }

  return (
    <div className="shrink-0 px-4 py-2 border-b bg-background/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="lucide:activity" className="w-3 h-3 text-primary" />
        <span className="text-xs text-muted-foreground">{progress}</span>
        {progressPercent !== null && (
          <span className="text-xs text-muted-foreground ml-auto">{progressPercent}%</span>
        )}
      </div>
      <Progress value={progressPercent} className="h-1" />
    </div>
  )
}

