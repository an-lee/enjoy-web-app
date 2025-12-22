/**
 * MetadataForm - Component for editing media metadata
 */

import { useTranslation } from 'react-i18next'
import { Input } from '@/page/components/ui/input'
import { Label } from '@/page/components/ui/label'
import { Textarea } from '@/page/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import { LANGUAGES, LEVELS } from './constants'
import type { MetadataFormProps } from './types'

export function MetadataForm({
  title,
  description,
  language,
  level,
  onTitleChange,
  onDescriptionChange,
  onLanguageChange,
  onLevelChange,
}: MetadataFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t('library.import.titleLabel')} *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('library.import.titlePlaceholder')}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          {t('library.import.descriptionLabel')}
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('library.import.descriptionPlaceholder')}
          rows={2}
        />
      </div>

      {/* Language & Level */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('library.import.languageLabel')}</Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('library.import.levelLabel')}</Label>
          <Select value={level} onValueChange={onLevelChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('library.import.levelPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  {t(`library.level.${lvl}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

