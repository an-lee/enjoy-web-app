/**
 * LanguageSelector Component
 *
 * Dropdown selector for choosing transcript languages (primary or secondary).
 */

import { Icon } from '@iconify/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'

interface LanguageSelectorProps {
  label: string
  value: string | null
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  placeholder: string
  allowNone?: boolean
  onClear?: () => void
}

export function LanguageSelector({
  label,
  value,
  options,
  onChange,
  placeholder,
  allowNone,
  onClear,
}: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {label}:
      </span>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-[100px] text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value="none" className="text-xs">
              None
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowNone && value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <Icon icon="lucide:x" className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

