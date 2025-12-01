import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES } from '@/lib/constants'

interface LanguageSelectorProps {
  language: string
  onLanguageChange: (language: string) => void
  disabled?: boolean
}

export function LanguageSelector({
  language,
  onLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="tts-language">{t('tts.targetLanguage')}</Label>
      <Select value={language} onValueChange={onLanguageChange} disabled={disabled}>
        <SelectTrigger id="tts-language" className="w-full">
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
  )
}

