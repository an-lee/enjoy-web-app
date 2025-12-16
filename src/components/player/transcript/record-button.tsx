/**
 * RecordButton Component
 *
 * Button for starting/stopping shadow reading recording.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface RecordButtonProps {
  isRecording: boolean
  onRecord: () => void
}

export function RecordButton({ isRecording, onRecord }: RecordButtonProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <button
        type="button"
        onClick={onRecord}
        className={cn(
          'flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all',
          'shadow-sm hover:shadow-md',
          isRecording
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-highlight-active-foreground text-highlight-active hover:opacity-90'
        )}
      >
        <Icon icon={isRecording ? 'lucide:square' : 'lucide:mic'} className="w-5 h-5" />
        <span>
          {isRecording ? t('player.transcript.stopRecording') : t('player.transcript.record')}
        </span>
      </button>
    </div>
  )
}

