export interface ExpandedPlayerProps {
  className?: string
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Whether it's a video */
  isVideo?: boolean
  /** Callback to seek to a position */
  onSeek?: (time: number) => void
  /** Callback to toggle play/pause */
  onTogglePlay?: () => void
}

