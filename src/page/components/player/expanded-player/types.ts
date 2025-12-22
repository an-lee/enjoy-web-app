export interface ExpandedPlayerProps {
  className?: string
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Error code for determining action buttons */
  errorCode?: string | null
  /** Whether it's a video */
  isVideo?: boolean
  /** Media element ref (for video display) */
  mediaRef?: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>
  /** Media URL (for video display) */
  mediaUrl?: string | null
  /** Media event handlers */
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onEnded?: () => void
  onCanPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  /** Retry handler for permission errors */
  onRetry?: () => void
  /** Reselect file handler for file not found errors */
  onReselectFile?: () => void
}

