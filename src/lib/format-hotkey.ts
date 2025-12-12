/**
 * Format hotkey string for display in tooltips
 *
 * Examples:
 * - "space" -> "Space"
 * - "ctrl+k" -> "Ctrl+K"
 * - "shift+comma" -> "Shift+<"
 * - "shift+period" -> "Shift+>"
 * - "[" -> "["
 */

const KEY_DISPLAY_MAP: Record<string, string> = {
  space: 'Space',
  enter: 'Enter',
  escape: 'Esc',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  comma: ',',
  period: '.',
  semicolon: ';',
  quote: "'",
  bracketleft: '[',
  bracketright: ']',
  braceleft: '{',
  braceright: '}',
  minus: '-',
  equal: '=',
  slash: '/',
  backslash: '\\',
}

const MODIFIER_DISPLAY_MAP: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  meta: 'Meta',
  cmd: 'Cmd',
}

/**
 * Format a hotkey string for display
 */
export function formatHotkey(keys: string): string {
  if (!keys) return ''

  const parts = keys.toLowerCase().split('+')
  const formattedParts: string[] = []
  let hasShift = false

  for (const part of parts) {
    const trimmed = part.trim()

    // Check if it's a modifier
    if (MODIFIER_DISPLAY_MAP[trimmed]) {
      if (trimmed === 'shift') {
        hasShift = true
      }
      formattedParts.push(MODIFIER_DISPLAY_MAP[trimmed])
      continue
    }

    // Handle shift+comma -> < and shift+period -> >
    if (hasShift && trimmed === 'comma') {
      // Replace the last "Shift" with "Shift+<"
      formattedParts[formattedParts.length - 1] = 'Shift+<'
      hasShift = false
      continue
    }
    if (hasShift && trimmed === 'period') {
      // Replace the last "Shift" with "Shift+>"
      formattedParts[formattedParts.length - 1] = 'Shift+>'
      hasShift = false
      continue
    }

    // Check if it's a special key
    if (KEY_DISPLAY_MAP[trimmed]) {
      formattedParts.push(KEY_DISPLAY_MAP[trimmed])
      continue
    }

    // Handle direct special characters
    if (trimmed.length === 1) {
      // Uppercase single characters
      formattedParts.push(trimmed.toUpperCase())
    } else {
      // Capitalize first letter for other keys
      formattedParts.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1))
    }
  }

  return formattedParts.join('+')
}

