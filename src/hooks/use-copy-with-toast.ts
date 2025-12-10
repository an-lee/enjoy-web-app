import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCopyToClipboard } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'useCopyWithToast' })

/**
 * Hook for copying text to clipboard with toast notifications
 * Provides a simple API with success/error feedback
 */
export function useCopyWithToast() {
  const { t } = useTranslation()
  const [, copyToClipboard] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string, options?: { successMessage?: string; errorMessage?: string }) => {
      try {
        await copyToClipboard(text)
        setCopied(true)
        toast.success(
          options?.successMessage ||
            t('translation.copied', { defaultValue: 'Copied to clipboard' })
        )
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        log.error('Failed to copy:', error)
        toast.error(
          options?.errorMessage || t('translation.copyFailed', { defaultValue: 'Failed to copy' })
        )
        throw error
      }
    },
    [copyToClipboard, t]
  )

  return {
    copy,
    copied,
  }
}

