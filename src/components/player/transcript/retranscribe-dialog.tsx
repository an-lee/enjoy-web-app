/**
 * RetranscribeDialog Component
 *
 * Confirmation dialog for retranscribing media with provider information and limitations.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Link } from '@tanstack/react-router'
import { getAIServiceConfig } from '@/ai/core/config'
import { AIProvider } from '@/ai/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RetranscribeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  mediaDuration: number
}

export function RetranscribeDialog({
  open,
  onOpenChange,
  onConfirm,
  mediaDuration,
}: RetranscribeDialogProps) {
  const { t } = useTranslation()

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')
  const providerName =
    asrConfig.provider === AIProvider.ENJOY
      ? t('player.transcript.provider.enjoy')
      : asrConfig.provider === AIProvider.LOCAL
        ? t('player.transcript.provider.local')
        : t('player.transcript.provider.byok')

  const durationMinutes = Math.ceil(mediaDuration / 60)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('player.transcript.confirmRetranscribe.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              <p className="font-medium mb-1">{t('player.transcript.confirmRetranscribe.currentProvider')}</p>
              <p className="text-sm">{providerName}</p>
              <Link
                to="/settings"
                search={{ tab: 'ai' }}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                onClick={() => onOpenChange(false)}
              >
                {t('player.transcript.confirmRetranscribe.changeSettings')}
                <Icon icon="lucide:external-link" className="w-3 h-3" />
              </Link>
            </div>

            <div>
              <p className="font-medium mb-1">{t('player.transcript.confirmRetranscribe.limitations')}</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {asrConfig.provider === AIProvider.LOCAL && (
                  <li>{t('player.transcript.confirmRetranscribe.limitation.local')}</li>
                )}
                {asrConfig.provider === AIProvider.ENJOY && (
                  <li>{t('player.transcript.confirmRetranscribe.limitation.enjoy')}</li>
                )}
                {durationMinutes > 30 && (
                  <li>{t('player.transcript.confirmRetranscribe.limitation.longDuration', { minutes: durationMinutes })}</li>
                )}
              </ul>
            </div>

            {asrConfig.provider === AIProvider.LOCAL && (
              <div className="bg-muted p-2 rounded text-xs">
                <p>{t('player.transcript.confirmRetranscribe.localNote')}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('player.transcript.confirmRetranscribe.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

