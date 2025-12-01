import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@iconify/react'

interface ErrorAlertProps {
  message: string
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive">
      <Icon icon="lucide:alert-circle" className="h-4 w-4" />
      <AlertDescription>{message || t('tts.error')}</AlertDescription>
    </Alert>
  )
}

