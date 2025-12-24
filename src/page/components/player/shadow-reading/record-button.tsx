/**
 * RecordButton Component
 *
 * Button for starting/stopping shadow reading recording.
 */

import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/page/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/page/components/ui/tooltip'
import { useHotkeyBinding } from '@/page/stores/hotkeys'
import { formatHotkeyAsKbd } from '@/page/lib/format-hotkey'

interface RecordButtonProps {
  isRecording: boolean
  onRecord: () => void
}

export function RecordButton({ isRecording, onRecord }: RecordButtonProps) {
  const { t } = useTranslation()
  const toggleRecordingKey = useHotkeyBinding('player.toggleRecording')

  // Get tooltip text based on recording state
  const tooltipText = isRecording
    ? t('player.transcript.stopRecording')
    : t('player.transcript.record')

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>{tooltipText}</span>
          {toggleRecordingKey && formatHotkeyAsKbd(toggleRecordingKey)}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

