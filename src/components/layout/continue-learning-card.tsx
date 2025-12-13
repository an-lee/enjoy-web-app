/**
 * ContinueLearningCard - Sidebar card to continue the last learning session
 *
 * TODO: Re-implement using EchoSession queries
 * Currently disabled as recentSession has been removed
 */

import { usePlayerStore } from '@/stores/player'

// ============================================================================
// Types
// ============================================================================

interface ContinueLearningCardProps {
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ContinueLearningCard(_props: ContinueLearningCardProps) {
  const { currentSession } = usePlayerStore()

  // Temporarily disabled - will be re-implemented using EchoSession queries
  // Don't show if there's already an active session
  if (currentSession) {
    return null
  }

  // TODO: Query most recent active EchoSession, load media info, and show continue card
  return null
}

