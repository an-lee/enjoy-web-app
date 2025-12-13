/**
 * ContinueLearningButton - Button to resume the last practice session
 *
 * TODO: Re-implement using EchoSession queries
 * Currently disabled as recentSession has been removed
 */

import { usePlayerStore } from '@/stores/player'

// ============================================================================
// Types
// ============================================================================

interface ContinueLearningButtonProps {
  className?: string
  variant?: 'default' | 'compact'
}

// ============================================================================
// Component
// ============================================================================

export function ContinueLearningButton(_props: ContinueLearningButtonProps) {
  const { currentSession } = usePlayerStore()

  // Temporarily disabled - will be re-implemented using EchoSession queries
  // Don't show if there's already an active session
  if (currentSession) {
    return null
  }

  // TODO: Query most recent active EchoSession and show continue button
  return null
}

