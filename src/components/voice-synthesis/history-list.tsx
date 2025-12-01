import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Icon } from '@iconify/react'
import type { Audio } from '@/db'
import { AudioHistoryItem } from './history-item'

interface TTSHistoryProps {
  history: Audio[]
  expandedItems: Set<string>
  isLoading?: boolean
  searchQuery: string
  onToggleItem: (id: string) => void
  onSearchChange: (query: string) => void
}

export function TTSHistory({
  history,
  expandedItems,
  isLoading = false,
  searchQuery,
  onToggleItem,
  onSearchChange,
}: TTSHistoryProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('tts.history')}</h2>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Icon icon="lucide:search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('tts.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icon="lucide:loader-2" className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {searchQuery.trim()
            ? t('common.noSearchResults')
            : t('tts.noHistory')}
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <AudioHistoryItem
              key={item.id}
              audio={item}
              isExpanded={expandedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}


