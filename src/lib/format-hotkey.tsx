/**
 * Format hotkey string for display in tooltips
 *
 * This module provides utilities to format keyboard shortcuts for display,
 * either as a string or as React components using the Kbd component.
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import { Kbd, KbdGroup } from '@/components/ui/kbd'

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

interface ParsedKey {
  text: string
  isModifier: boolean
}

/**
 * Parse a hotkey string into individual key parts
 */
function parseHotkey(keys: string): ParsedKey[] {
  if (!keys) return []

  const parts = keys.toLowerCase().split('+')
  const parsed: ParsedKey[] = []
  let hasShift = false

  for (const part of parts) {
    const trimmed = part.trim()

    // Check if it's a modifier
    if (MODIFIER_DISPLAY_MAP[trimmed]) {
      if (trimmed === 'shift') {
        hasShift = true
      }
      parsed.push({
        text: MODIFIER_DISPLAY_MAP[trimmed],
        isModifier: true,
      })
      continue
    }

    // Handle shift+comma -> < and shift+period -> >
    if (hasShift && trimmed === 'comma') {
      // Replace the last "Shift" with "<"
      parsed[parsed.length - 1] = { text: '<', isModifier: false }
      hasShift = false
      continue
    }
    if (hasShift && trimmed === 'period') {
      // Replace the last "Shift" with ">"
      parsed[parsed.length - 1] = { text: '>', isModifier: false }
      hasShift = false
      continue
    }

    // Check if it's a special key
    if (KEY_DISPLAY_MAP[trimmed]) {
      parsed.push({
        text: KEY_DISPLAY_MAP[trimmed],
        isModifier: false,
      })
      continue
    }

    // Handle direct special characters
    if (trimmed.length === 1) {
      // Uppercase single characters
      parsed.push({
        text: trimmed.toUpperCase(),
        isModifier: false,
      })
    } else {
      // Capitalize first letter for other keys
      parsed.push({
        text: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        isModifier: false,
      })
    }
  }

  return parsed
}

/**
 * Format a hotkey string for display as text
 */
export function formatHotkey(keys: string): string {
  const parsed = parseHotkey(keys)
  return parsed.map((p) => p.text).join('+')
}

/**
 * Format a hotkey string as React components using Kbd
 */
export function formatHotkeyAsKbd(keys: string): ReactNode {
  const parsed = parseHotkey(keys)
  if (parsed.length === 0) return null

  return (
    <KbdGroup>
      {parsed.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-0.5">+</span>}
          <Kbd>{key.text}</Kbd>
        </React.Fragment>
      ))}
    </KbdGroup>
  )
}

