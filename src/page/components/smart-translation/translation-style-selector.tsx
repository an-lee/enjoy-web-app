import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import type { TranslationStyle } from '@/page/types/db'

const TRANSLATION_STYLES: { value: TranslationStyle; label: string }[] = [
  { value: 'literal', label: 'translation.styleLiteral' },
  { value: 'natural', label: 'translation.styleNatural' },
  { value: 'casual', label: 'translation.styleCasual' },
  { value: 'formal', label: 'translation.styleFormal' },
  { value: 'simplified', label: 'translation.styleSimplified' },
  { value: 'detailed', label: 'translation.styleDetailed' },
  { value: 'custom', label: 'translation.styleCustom' },
]

interface TranslationStyleSelectorProps {
  value: TranslationStyle
  onValueChange: (style: TranslationStyle) => void
  disabled?: boolean
}

export function TranslationStyleSelector({
  value,
  onValueChange,
  disabled = false,
}: TranslationStyleSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="translation-style">{t('translation.translationStyle')}</Label>
      <Select
        value={value}
        onValueChange={(val) => onValueChange(val as TranslationStyle)}
        disabled={disabled}
      >
        <SelectTrigger id="translation-style" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRANSLATION_STYLES.map((style) => (
            <SelectItem key={style.value} value={style.value}>
              {t(style.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

