import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { type Translation } from '@/db'

interface HistoryItemProps {
  translation: Translation
  isExpanded: boolean
  onToggle: () => void
}

export function HistoryItem({
  translation,
  isExpanded,
  onToggle,
}: HistoryItemProps) {
  const { t } = useTranslation()

  return (
    <div className="border rounded-md">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{translation.sourceText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(translation.createdAt).toLocaleString()}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3 border-t bg-muted/30">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {t('translation.translatedText')}
            </Label>
            <p className="text-sm whitespace-pre-wrap">{translation.translatedText}</p>
          </div>
        </div>
      )}
    </div>
  )
}

