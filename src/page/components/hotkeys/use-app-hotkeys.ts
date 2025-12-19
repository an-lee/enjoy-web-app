/**
 * useAppHotkeys - Custom hook for using hotkeys with the app's hotkey store
 *
 * This hook integrates react-hotkeys-hook with our hotkey configuration store,
 * allowing for user-customizable key bindings.
 */

import { useHotkeys, type Options } from 'react-hotkeys-hook'
import { useHotkeysStore, HOTKEY_MAP, type HotkeyScope } from '@/page/stores/hotkeys'
import { useCallback, useMemo, useEffect } from 'react'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'Hotkeys' })

// ============================================================================
// Types
// ============================================================================

type HotkeyCallback = (event: KeyboardEvent) => void

interface UseAppHotkeysOptions extends Omit<Options, 'scopes'> {
  /** Dependencies for the callback */
  deps?: unknown[]
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Use an app-defined hotkey action
 *
 * @param actionId - The action ID from HOTKEY_DEFINITIONS (e.g., 'player.togglePlay')
 * @param callback - The callback to execute when the hotkey is pressed
 * @param options - Additional options for useHotkeys
 *
 * @example
 * useAppHotkey('player.togglePlay', () => {
 *   togglePlay()
 * })
 */
export function useAppHotkey(
  actionId: string,
  callback: HotkeyCallback,
  options?: UseAppHotkeysOptions
) {
  const getKeys = useHotkeysStore((state) => state.getKeys)
  const definition = HOTKEY_MAP.get(actionId)

  const keys = useMemo(() => getKeys(actionId), [getKeys, actionId])
  const scope = definition?.scope as HotkeyScope | undefined
  const useKey = definition?.useKey ?? false

  // Memoize scopes to prevent unnecessary re-renders
  // For global scope, also include wildcard '*' to ensure it's always active
  const scopes = useMemo(
    () => (scope === 'global' ? ['global', '*'] : scope ? [scope] : undefined),
    [scope]
  )

  // Debug log on mount (only depends on stable values)
  useEffect(() => {
    log.debug(`Registered hotkey: ${actionId}`, { keys, scope, scopes, useKey })
  }, [actionId, keys, scope, useKey])

  const memoizedCallback = useCallback(
    (event: KeyboardEvent) => {
      log.debug(`Hotkey triggered: ${actionId}`)
      callback(event)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options?.deps ?? [callback]
  )

  return useHotkeys(
    keys,
    memoizedCallback,
    {
      ...options,
      scopes,
      useKey,
      enabled: keys.length > 0 && (options?.enabled ?? true),
    },
    options?.deps
  )
}

/**
 * Use multiple app-defined hotkey actions
 *
 * @param configs - Array of [actionId, callback] tuples
 * @param options - Shared options for all hotkeys
 */
export function useAppHotkeys(
  configs: Array<[string, HotkeyCallback]>,
  options?: UseAppHotkeysOptions
) {
  const getKeys = useHotkeysStore((state) => state.getKeys)

  configs.forEach(([actionId, callback]) => {
    const definition = HOTKEY_MAP.get(actionId)
    const keys = getKeys(actionId)
    const scope = definition?.scope as HotkeyScope | undefined

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(
      keys,
      callback,
      {
        ...options,
        scopes: scope ? [scope] : undefined,
        enabled: keys.length > 0 && (options?.enabled ?? true),
      },
      options?.deps
    )
  })
}

// Re-export the original useHotkeys for cases where app integration isn't needed
export { useHotkeys } from 'react-hotkeys-hook'

