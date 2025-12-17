/**
 * RecordButton Component
 *
 * Button for starting/stopping shadow reading recording.
 */

import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface RecordButtonProps {
  isRecording: boolean
  onRecord: () => void
}

export function RecordButton({ isRecording, onRecord }: RecordButtonProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <Button
        onClick={onRecord}
        className="rounded-full"
        size="lg"
        variant={isRecording ? 'destructive' : 'default'}
      >
        <Icon icon={isRecording ? 'lucide:square' : 'lucide:mic'} className="w-5 h-5" />
        <span>
          {isRecording ? t('player.transcript.stopRecording') : t('player.transcript.record')}
        </span>
      </Button>
    </div>
  )
}

