/**
 * TranscriptLines Component
 *
 * Renders the list of transcript lines with echo region controls.
 */

import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { TranscriptLineItem } from './transcript-line-item'
import { EchoRegionControls } from './echo-region-controls'
import { ShadowReadingPanel } from './shadow-reading-panel'
import { useEchoRegion } from './use-echo-region'
import type { TranscriptLineState } from './types'

interface TranscriptLinesProps {
  lines: TranscriptLineState[]
  showSecondary: boolean
  onLineClick: (line: TranscriptLineState) => void
}

function TranscriptLinesComponent({
  lines,
  showSecondary,
  onLineClick,
}: TranscriptLinesProps) {
  const { t } = useTranslation()

  // Echo region management
  const {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoRegionTimeRange,
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  } = useEchoRegion(lines)

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
    <div className="py-4 px-3 space-y-1.5">
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
              <EchoRegionControls
                position="top"
                onExpand={handleExpandEchoBackward}
                onShrink={handleShrinkEchoBackward}
                expandDisabled={echoStartLineIndex === 0}
                shrinkDisabled={echoStartLineIndex >= echoEndLineIndex}
                expandLabel={t('player.transcript.expandEchoBackward')}
                shrinkLabel={t('player.transcript.shrinkEchoBackward')}
              />
            )}

            <TranscriptLineItem
              line={line}
              showSecondary={showSecondary}
              onClick={
                // Disable click-to-seek when in echo region or when line is active
                // to allow reliable text selection.
                isInEchoRegion || line.isActive ? undefined : () => onLineClick(line)
              }
              isInEchoRegion={isInEchoRegion}
              isEchoStart={isEchoStart}
              isEchoEnd={isEchoEnd}
            />

            {/* Echo region bottom controls - shown below the last line of echo region */}
            {isEchoEnd && echoModeActive && (
              <>
                <EchoRegionControls
                  position="bottom"
                  onExpand={handleExpandEchoForward}
                  onShrink={handleShrinkEchoForward}
                  expandDisabled={echoEndLineIndex >= lines.length - 1}
                  shrinkDisabled={echoEndLineIndex <= echoStartLineIndex}
                  expandLabel={t('player.transcript.expandEchoForward')}
                  shrinkLabel={t('player.transcript.shrinkEchoForward')}
                />
                {/* Shadow Reading Panel - shown below echo region controls */}
                {echoRegionTimeRange?.startTime !== undefined && echoRegionTimeRange?.endTime !== undefined && (
                  <ShadowReadingPanel
                    startTime={echoRegionTimeRange.startTime}
                    endTime={echoRegionTimeRange.endTime}
                    referenceText={referenceText || ''}
                  />
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const TranscriptLines = memo(TranscriptLinesComponent)

