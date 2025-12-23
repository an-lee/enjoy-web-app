/**
 * TranscribeDialog Component
 *
 * Confirmation dialog for transcribing media with provider information and limitations.
 * Handles transcription logic internally using useTranscribe hook.
 */

import { useCallback, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Link } from '@tanstack/react-router'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { AIProvider } from '@/page/ai/types'
import { usePlayerStore } from '@/page/stores/player'
import { useTranscribe } from '@/page/hooks/player'
import { useTranscriptDisplay } from '@/page/hooks/player/use-transcript-display'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/page/components/ui/alert-dialog'
import { Badge } from '@/page/components/ui/badge'

interface TranscribeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mediaDuration: number
  /** Optional ref to existing media element (audio or video) */
  mediaRef?: RefObject<HTMLAudioElement | HTMLVideoElement | null>
}

export function TranscribeDialog({
  open,
  onOpenChange,
  mediaDuration,
  mediaRef,
}: TranscribeDialogProps) {
  const { t } = useTranslation()
  const collapse = usePlayerStore((state) => state.collapse)

  // Get primary language from transcript display hook
  const { primaryLanguage } = useTranscriptDisplay()

  // Get transcribe functionality
  const { transcribe } = useTranscribe({ mediaRef })

  // Handle confirm transcribe
  const handleConfirm = useCallback(() => {
    onOpenChange(false)
    transcribe(primaryLanguage || undefined)
  }, [onOpenChange, transcribe, primaryLanguage])

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')
  const providerName =
    asrConfig.provider === AIProvider.ENJOY
      ? t('player.transcript.provider.enjoy')
      : asrConfig.provider === AIProvider.LOCAL
        ? t('player.transcript.provider.local')
        : t('player.transcript.provider.byok')

  const durationMinutes = Math.ceil(mediaDuration / 60)

  const hasLimitations =
    asrConfig.provider === AIProvider.LOCAL ||
    asrConfig.provider === AIProvider.ENJOY ||
    durationMinutes > 30

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('player.transcript.confirmTranscribe.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('player.transcript.confirmTranscribe.description')}
          </AlertDialogDescription>
          <div className="space-y-4 text-sm text-muted-foreground">
            {/* Provider Info */}
            <div className="flex items-center justify-between gap-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:settings-2" className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('player.transcript.confirmTranscribe.currentProvider')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{providerName}</Badge>
                <Link
                  to="/settings"
                  search={{ tab: 'ai' }}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  onClick={() => {
                    onOpenChange(false)
                    collapse()
                  }}
                >
                  <Icon icon="lucide:external-link" className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Limitations */}
            {hasLimitations && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:info" className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('player.transcript.confirmTranscribe.limitations')}
                  </span>
                </div>
                <ul className="text-sm space-y-1.5 ml-6 list-disc text-muted-foreground">
                  {asrConfig.provider === AIProvider.LOCAL && (
                    <li>{t('player.transcript.confirmTranscribe.limitation.local')}</li>
                  )}
                  {asrConfig.provider === AIProvider.ENJOY && (
                    <li>{t('player.transcript.confirmTranscribe.limitation.enjoy')}</li>
                  )}
                  {durationMinutes > 30 && (
                    <li>
                      {t('player.transcript.confirmTranscribe.limitation.longDuration', {
                        minutes: durationMinutes,
                      })}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {t('player.transcript.confirmTranscribe.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

