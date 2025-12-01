import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'

interface TTSHistoryToggleProps {
  isExpanded: boolean
  onToggle: () => void
}

export function TTSHistoryToggle({ isExpanded, onToggle }: TTSHistoryToggleProps) {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="text-sm text-muted-foreground"
      >
        {isExpanded ? (
          <>
            <Icon icon="lucide:chevron-up" className="mr-1 h-4 w-4" />
            {t('tts.hideHistory')}
          </>
        ) : (
          <>
            <Icon icon="lucide:chevron-down" className="mr-1 h-4 w-4" />
            {t('tts.showHistory')}
          </>
        )}
      </Button>
    </div>
  )
}


