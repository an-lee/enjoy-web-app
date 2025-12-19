import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { LANGUAGES } from '@/page/lib/constants'

interface LanguageSelectorProps {
  sourceLanguage: string
  targetLanguage: string
  onSourceLanguageChange: (language: string) => void
  onTargetLanguageChange: (language: string) => void
  onSwapLanguages: () => void
  disabled?: boolean
}

export function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSwapLanguages,
  disabled = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-2">
        <Label htmlFor="source-language">{t('translation.sourceLanguage')}</Label>
        <Select
          value={sourceLanguage}
          onValueChange={onSourceLanguageChange}
          disabled={disabled}
        >
          <SelectTrigger id="source-language" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSwapLanguages}
          disabled={disabled}
          className="h-9 w-9 shrink-0"
          title={t('translation.swapLanguages', { defaultValue: 'Swap languages' })}
        >
          <Icon icon="lucide:arrow-left-right" className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor="target-language">{t('translation.targetLanguage')}</Label>
        <Select
          value={targetLanguage}
          onValueChange={onTargetLanguageChange}
          disabled={disabled}
        >
          <SelectTrigger id="target-language" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

