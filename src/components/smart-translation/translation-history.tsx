import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { type Translation } from '@/db'
import { HistoryItem } from './history-item'

interface TranslationHistoryProps {
  history: Translation[]
  expandedItems: Set<string>
  currentPage: number
  totalPages: number
  isLoading?: boolean
  onToggleItem: (id: string) => void
  onPageChange: (page: number) => void
}

export function TranslationHistory({
  history,
  expandedItems,
  currentPage,
  totalPages,
  isLoading = false,
  onToggleItem,
  onPageChange,
}: TranslationHistoryProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('translation.history')}</h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {t('translation.noHistory')}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {history.map((item) => (
              <HistoryItem
                key={item.id}
                translation={item}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => onToggleItem(item.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t('translation.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('translation.page')} {currentPage} {t('translation.of')}{' '}
                {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                {t('translation.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

