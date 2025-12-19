import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import { Textarea } from '@/page/components/ui/textarea'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  disabled?: boolean
}

export function TextInput({
  value,
  onChange,
  onClear,
  disabled = false,
}: TextInputProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="tts-input">{t('tts.inputText')}</Label>
      <div className="relative">
        <Textarea
          id="tts-input"
          placeholder={t('tts.inputPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px] pr-10"
          disabled={disabled}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={onClear}
            disabled={disabled}
            title={t('tts.clear', { defaultValue: 'Clear' })}
          >
            <Icon icon="lucide:x" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

