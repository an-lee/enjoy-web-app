/**
 * TranscriptLines Component
 *
 * Renders the list of transcript lines with echo region controls.
 */

import { memo, useMemo } from 'react'
import { cn } from '@/shared/lib/utils'
import { TranscriptLineItem } from './transcript-line-item'
import { EchoRegionControls } from '../echo/echo-region-controls'
import { ShadowReadingPanel } from '../shadow-reading/shadow-reading-panel'
import { TextSelectionPanel } from './text-selection-panel'
import { useEchoRegion } from '@/page/hooks/player'
import { useTextSelection } from '@/page/hooks/player/use-text-selection'
import { useDisplayTime } from '@/page/hooks/player/use-display-time'
import { useRecordingsByTarget } from '@/page/hooks/queries'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { getTranscriptLineId } from './constants'
import type { TranscriptLineState } from './types'
import type { TargetType } from '@/page/types/db'

interface TranscriptLinesProps {
  lines: TranscriptLineState[]
  onLineClick: (line: TranscriptLineState) => void
  /** Primary transcript language (for dictionary/translation lookups) */
  primaryLanguage?: string
}

function TranscriptLinesComponent({
  lines,
  onLineClick,
  primaryLanguage = 'en',
}: TranscriptLinesProps) {
  // Get current time to determine if any line is active
  const currentTimeSeconds = useDisplayTime()

  // Echo region state (no lines needed, we only read state for rendering)
  const {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoStartTime,
    echoEndTime,
  } = useEchoRegion()

  // Determine if text selection should be enabled
  // Enable when any line is active or when echo mode is active
  const shouldAllowTextSelection = useMemo(() => {
    // Check if any line is currently active
    const hasActiveLine = lines.some(
      (line) =>
        currentTimeSeconds >= line.startTimeSeconds &&
        currentTimeSeconds < line.endTimeSeconds
    )
    return hasActiveLine || echoModeActive
  }, [lines, currentTimeSeconds, echoModeActive])

  // Text selection detection - enabled when text selection is allowed
  const { selection, clearSelection, containerRef } = useTextSelection<HTMLDivElement>({
    enabled: shouldAllowTextSelection,
    minLength: 1,
    maxLength: 100,
  })

  // Get current media info for fetching recordings
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const { targetType, targetId } = useMemo<{
    targetType: TargetType | null
    targetId: string | null
  }>(() => {
    if (!currentSession) {
      return { targetType: null, targetId: null }
    }
    return {
      targetType: (currentSession.mediaType === 'video' ? 'Video' : 'Audio') as TargetType,
      targetId: currentSession.mediaId,
    }
  }, [currentSession?.mediaType, currentSession?.mediaId])

  // Fetch all recordings for current media
  const { recordings } = useRecordingsByTarget({
    targetType,
    targetId,
    enabled: !!targetType && !!targetId,
  })

  // Calculate recording counts for each line
  // Optimized: Pre-convert line times to milliseconds once to avoid repeated conversions
  const lineRecordingCounts = useMemo(() => {
    const counts = new Map<number, number>()

    // Pre-convert recordings end times to avoid repeated calculations
    const recordingsWithEndTimes = recordings.map((recording) => ({
      recording,
      startMs: recording.referenceStart,
      endMs: recording.referenceStart + recording.referenceDuration,
    }))

    lines.forEach((line) => {
      // Convert once per line instead of per recording
      const lineStartMs = line.startTimeSeconds * 1000
      const lineEndMs = line.endTimeSeconds * 1000

      // Count overlapping recordings using pre-calculated values
      let count = 0
      for (const { startMs, endMs } of recordingsWithEndTimes) {
        // Two ranges overlap if: max(start1, start2) < min(end1, end2)
        if (Math.max(startMs, lineStartMs) < Math.min(endMs, lineEndMs)) {
          count++
        }
      }
      counts.set(line.index, count)
    })

    return counts
  }, [lines, recordings])

  // Get reference text from echo region lines
  const referenceText = useMemo(() => {
    if (!echoModeActive || echoStartLineIndex < 0 || echoEndLineIndex < 0) {
      return ''
    }
    return lines
      .filter(
        (line) => line.index >= echoStartLineIndex && line.index <= echoEndLineIndex
      )
      .map((line) => line.primary.text)
      .join(' ')
  }, [echoModeActive, echoStartLineIndex, echoEndLineIndex, lines])

  return (
    <div ref={containerRef} className="py-4 px-3 space-y-1.5">
      {lines.map((line, lineArrayIndex) => {
        const isInEchoRegion =
          echoModeActive &&
          line.index >= echoStartLineIndex &&
          line.index <= echoEndLineIndex
        const isEchoStart = echoModeActive && line.index === echoStartLineIndex
        const isEchoEnd = echoModeActive && line.index === echoEndLineIndex

        // Check if previous/next line is in echo region to determine spacing
        const prevLineInEcho =
          lineArrayIndex > 0 &&
          echoModeActive &&
          lines[lineArrayIndex - 1].index >= echoStartLineIndex &&
          lines[lineArrayIndex - 1].index <= echoEndLineIndex
        const nextLineInEcho =
          lineArrayIndex < lines.length - 1 &&
          echoModeActive &&
          lines[lineArrayIndex + 1].index >= echoStartLineIndex &&
          lines[lineArrayIndex + 1].index <= echoEndLineIndex

        return (
          <div
            key={line.index}
            id={getTranscriptLineId(line.index)}
            data-line-index={line.index}
            className={cn(
              'relative',
              // Remove spacing between echo region lines
              isInEchoRegion && prevLineInEcho && '-mt-2',
              // Remove spacing after echo region
              isInEchoRegion && !nextLineInEcho && isEchoEnd && 'mb-0'
            )}
          >
            {/* Echo region top controls - shown above the first line of echo region */}
            {isEchoStart && echoModeActive && (
              <EchoRegionControls position="top" lines={lines} />
            )}

            <TranscriptLineItem
              line={line}
              onLineClick={onLineClick}
              recordingCount={lineRecordingCounts.get(line.index) ?? 0}
            />

            {/* Echo region bottom controls - shown below the last line of echo region */}
            {isEchoEnd && echoModeActive && (
              <>
                <EchoRegionControls position="bottom" lines={lines} />
                {/* Shadow Reading Panel - shown below echo region controls */}
                {echoStartTime >= 0 && echoEndTime >= 0 && (
                  <ShadowReadingPanel
                    startTime={echoStartTime}
                    endTime={echoEndTime}
                    referenceText={referenceText || ''}
                  />
                )}
              </>
            )}
          </div>
        )
      })}
      {/* Text selection panel - rendered once for the entire container */}
      <TextSelectionPanel
        selection={selection}
        sourceLanguage={primaryLanguage}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection()
          }
        }}
      />
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const TranscriptLines = memo(TranscriptLinesComponent)

