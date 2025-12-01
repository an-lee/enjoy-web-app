import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'

interface TranslationInputProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onTranslate: () => void
  disabled?: boolean
}

export function TranslationInput({
  value,
  onChange,
  onClear,
  onTranslate,
  disabled = false,
}: TranslationInputProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="translation-input">{t('translation.sourceText')}</Label>
      <div className="relative">
        <Textarea
          id="translation-input"
          placeholder={t('translation.inputPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px] pr-10"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onTranslate()
            }
          }}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={onClear}
            disabled={disabled}
            title={t('translation.clear', { defaultValue: 'Clear' })}
          >
            <Icon icon="lucide:x" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

