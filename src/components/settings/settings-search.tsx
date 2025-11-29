import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SettingsSearchProps {
  value: string
  onChange: (value: string) => void
}

export function SettingsSearch({ value, onChange }: SettingsSearchProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="search"
          placeholder={t('settings.searchPlaceholder', { defaultValue: 'Search settings...' })}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}

