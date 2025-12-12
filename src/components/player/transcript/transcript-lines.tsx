/**
 * TranscriptLines Component
 *
 * Renders the list of transcript lines with echo region controls.
 */

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { TranscriptLineItem } from './transcript-line-item'
import { EchoRegionControls } from './echo-region-controls'
import type { TranscriptLineState } from './types'

interface TranscriptLinesProps {
  lines: TranscriptLineState[]
  showSecondary: boolean
  onLineClick: (startTimeSeconds: number) => void
  echoModeActive: boolean
  echoStartLineIndex: number
  echoEndLineIndex: number
  onExpandEchoForward: () => void
  onExpandEchoBackward: () => void
  onShrinkEchoForward: () => void
  onShrinkEchoBackward: () => void
}

export function TranscriptLines({
  lines,
  showSecondary,
  onLineClick,
  echoModeActive,
  echoStartLineIndex,
  echoEndLineIndex,
  onExpandEchoForward,
  onExpandEchoBackward,
  onShrinkEchoForward,
  onShrinkEchoBackward,
}: TranscriptLinesProps) {
  const { t } = useTranslation()

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
                onExpand={onExpandEchoBackward}
                onShrink={onShrinkEchoBackward}
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
                // In echo mode, we disable click-to-seek inside the echo region
                // to allow reliable text selection.
                isInEchoRegion ? undefined : () => onLineClick(line.startTimeSeconds)
              }
              isInEchoRegion={isInEchoRegion}
              isEchoStart={isEchoStart}
              isEchoEnd={isEchoEnd}
            />

            {/* Echo region bottom controls - shown below the last line of echo region */}
            {isEchoEnd && echoModeActive && (
              <EchoRegionControls
                position="bottom"
                onExpand={onExpandEchoForward}
                onShrink={onShrinkEchoForward}
                expandDisabled={echoEndLineIndex >= lines.length - 1}
                shrinkDisabled={echoEndLineIndex <= echoStartLineIndex}
                expandLabel={t('player.transcript.expandEchoForward')}
                shrinkLabel={t('player.transcript.shrinkEchoForward')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

