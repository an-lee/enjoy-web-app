import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CustomPromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CustomPromptInput({
  value,
  onChange,
  disabled = false,
}: CustomPromptInputProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2 p-4 bg-muted/50 rounded-md border">
      <div className="space-y-2">
        <Label htmlFor="custom-prompt">{t('translation.customPrompt')}</Label>
        <Textarea
          id="custom-prompt"
          placeholder={t('translation.customPromptPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>{t('translation.customPromptDescription')}</p>
        <p className="text-xs italic">{t('translation.customPromptHint')}</p>
      </div>
    </div>
  )
}

