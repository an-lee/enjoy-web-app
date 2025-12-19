import { useTranslation } from 'react-i18next'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'

interface HistoryToggleProps {
  isExpanded: boolean
  onToggle: () => void
}

export function HistoryToggle({ isExpanded, onToggle }: HistoryToggleProps) {
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
            {t('translation.hideHistory')}
          </>
        ) : (
          <>
            <Icon icon="lucide:chevron-down" className="mr-1 h-4 w-4" />
            {t('translation.showHistory')}
          </>
        )}
      </Button>
    </div>
  )
}

