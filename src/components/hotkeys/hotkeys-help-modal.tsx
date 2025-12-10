/**
 * HotkeysHelpModal - Displays all available keyboard shortcuts
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  getHotkeysByScope,
  useHotkeysStore,
  type HotkeyScope,
} from '@/stores/hotkeys'

// ============================================================================
// Types
// ============================================================================

interface HotkeysHelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// Helper Components
// ============================================================================

function KeyBadge({ keys }: { keys: string }) {
  // Split by + and render each key
  const parts = keys.split('+').map((key) => key.trim())

  return (
    <div className="flex items-center gap-1">
      {parts.map((key, index) => (
        <span key={index}>
          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium bg-muted border border-border rounded shadow-sm">
            {formatKeyName(key)}
          </kbd>
          {index < parts.length - 1 && (
            <span className="text-muted-foreground mx-0.5">+</span>
          )}
        </span>
      ))}
    </div>
  )
}

function formatKeyName(key: string): string {
  const keyMap: Record<string, string> = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: '⌘',
    space: 'Space',
    left: '←',
    right: '→',
    up: '↑',
    down: '↓',
    escape: 'Esc',
    enter: 'Enter',
    backspace: '⌫',
    delete: 'Del',
    tab: 'Tab',
    comma: ',',
  }
  return keyMap[key.toLowerCase()] ?? key.toUpperCase()
}

function ScopeSection({
  scope,
  title,
  icon,
}: {
  scope: HotkeyScope
  title: string
  icon: string
}) {
  const { t } = useTranslation()
  const getKeys = useHotkeysStore((state) => state.getKeys)
  const hotkeys = getHotkeysByScope(scope)

  if (hotkeys.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon icon={icon} className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {hotkeys.map((hotkey) => {
          const keys = getKeys(hotkey.id)
          const isCustom = useHotkeysStore.getState().customBindings[hotkey.id]

          return (
            <div
              key={hotkey.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <span className="text-sm">
                {t(hotkey.descriptionKey, hotkey.description)}
              </span>
              <div className="flex items-center gap-2">
                {isCustom && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {t('hotkeys.customized')}
                  </Badge>
                )}
                <KeyBadge keys={keys} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function HotkeysHelpModal({ open, onOpenChange }: HotkeysHelpModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:keyboard" className="w-5 h-5" />
            {t('hotkeys.title', 'Keyboard Shortcuts')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ScopeSection
            scope="global"
            title={t('hotkeys.scope.global', 'Global')}
            icon="lucide:globe"
          />

          <ScopeSection
            scope="player"
            title={t('hotkeys.scope.player', 'Player')}
            icon="lucide:play-circle"
          />

          <ScopeSection
            scope="library"
            title={t('hotkeys.scope.library', 'Library')}
            icon="lucide:library"
          />

          <ScopeSection
            scope="modal"
            title={t('hotkeys.scope.modal', 'Modal')}
            icon="lucide:square"
          />
        </div>

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>{t('hotkeys.hint', 'Press ? anywhere to show this help')}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

