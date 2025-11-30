import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { type Translation } from '@/db'
import { HistoryItem } from './history-item'

interface TranslationHistoryProps {
  history: Translation[]
  expandedItems: Set<string>
  currentPage: number
  totalPages: number
  isLoading?: boolean
  searchQuery: string
  onToggleItem: (id: string) => void
  onPageChange: (page: number) => void
  onSearchChange: (query: string) => void
}

export function TranslationHistory({
  history,
  expandedItems,
  currentPage,
  totalPages,
  isLoading = false,
  searchQuery,
  onToggleItem,
  onPageChange,
  onSearchChange,
}: TranslationHistoryProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('translation.history')}</h2>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('translation.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {searchQuery.trim()
            ? t('translation.noSearchResults')
            : t('translation.noHistory')}
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

