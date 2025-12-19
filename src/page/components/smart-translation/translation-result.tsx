import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import type { Translation } from '@/page/types/db'

interface TranslationResultProps {
  translation: Translation
  onRegenerate: () => void
  isRegenerating?: boolean
}

export function TranslationResult({
  translation,
  onRegenerate,
  isRegenerating = false,
}: TranslationResultProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          {t('translation.translatedText')}
        </Label>
        <div className="p-4 bg-muted rounded-md min-h-[60px]">
          <p className="whitespace-pre-wrap">{translation.translatedText}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <Icon
            icon="lucide:refresh-cw"
            className={cn('mr-2 h-4 w-4', isRegenerating && 'animate-spin')}
          />
          {t('translation.regenerate')}
        </Button>
      </div>
    </div>
  )
}

