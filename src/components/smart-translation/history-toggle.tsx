import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
            <ChevronUp className="mr-1 h-4 w-4" />
            {t('translation.hideHistory')}
          </>
        ) : (
          <>
            <ChevronDown className="mr-1 h-4 w-4" />
            {t('translation.showHistory')}
          </>
        )}
      </Button>
    </div>
  )
}

