import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useIsMobile } from '@/hooks/use-mobile'
import type { EchoRegionSeriesPoint } from '@/lib/audio/echo-region-analysis'

function formatSecondsShort(value: number) {
  if (!Number.isFinite(value)) return ''
  if (value < 1) return `${value.toFixed(2)}s`
  if (value < 10) return `${value.toFixed(1)}s`
  return `${Math.round(value)}s`
}

export interface PitchContourVisibility {
  showWaveform: boolean
  showReference: boolean
  showUser: boolean
}

export function PitchContourChart({
  data,
  className,
  labels,
  currentTimeRelative,
  visibility,
}: {
  data: EchoRegionSeriesPoint[]
  className?: string
  labels: {
    waveform: string
    pitch: string
    yourWaveform: string
    yourPitch: string
  }
  /** Current playback time relative to region start (in seconds), undefined to hide progress */
  currentTimeRelative?: number
  /** Visibility controls for different chart elements */
  visibility?: PitchContourVisibility
}) {
  const defaultVisibility: PitchContourVisibility = {
    showWaveform: true,
    showReference: true,
    showUser: true,
  }
  const vis = visibility ?? defaultVisibility

  const chartConfig: ChartConfig = React.useMemo(
    () => ({
      // Colors are defined in styles.css as CSS variables
      // This config is mainly for labels and legend
      ampRef: { label: labels.waveform },
      pitchRefHz: { label: labels.pitch },
      ampUser: { label: labels.yourWaveform },
      pitchUserHz: { label: labels.yourPitch },
    }),
    [labels]
  )

  const hasUser = React.useMemo(
    () => data.some((p) => p.ampUser !== undefined || p.pitchUserHz !== undefined),
    [data]
  )

  const isMobile = useIsMobile()

  // Adjust margins and axis widths for mobile
  const margin = React.useMemo(
    () => (isMobile ? { left: 0, right: 0, top: 10, bottom: 6 } : { left: 10, right: 16, top: 10, bottom: 6 }),
    [isMobile]
  )

  const ampAxisWidth = isMobile ? 0 : 36
  const pitchAxisWidth = isMobile ? 0 : 48

  // Calculate max time and pitch from data for boundary check
  const maxTime = React.useMemo(() => {
    return data.length > 0 ? Math.max(...data.map((d) => d.t)) : 0
  }, [data])

  const maxPitch = React.useMemo(() => {
    const pitches = data
      .map((d) => [d.pitchRefHz, d.pitchUserHz])
      .flat()
      .filter((p): p is number => p !== null && p !== undefined && Number.isFinite(p))
    // Add 20% padding and round up to nearest 50 for stability
    const rawMax = pitches.length > 0 ? Math.max(...pitches) : 1000
    return Math.ceil(rawMax * 1.2 / 50) * 50
  }, [data])

  // Merge progress background data into main data array
  const dataWithProgress = React.useMemo(() => {
    if (
      currentTimeRelative === undefined ||
      !Number.isFinite(currentTimeRelative) ||
      currentTimeRelative <= 0 ||
      data.length === 0
    ) {
      return data
    }
    const progressEnd = Math.min(currentTimeRelative, maxTime)
    // Add progress background value to each data point
    return data.map((point) => ({
      ...point,
      progressBg: point.t <= progressEnd ? maxPitch : null,
    }))
  }, [data, currentTimeRelative, maxTime, maxPitch])

  return (
    <ChartContainer className={className} config={chartConfig}>
      <AreaChart data={dataWithProgress} margin={margin}>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={isMobile ? 32 : 24}
          tickFormatter={(v) => formatSecondsShort(Number(v))}
        />

        <YAxis
          yAxisId="amp"
          domain={[0, 1]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={ampAxisWidth}
          hide={isMobile}
        />

        <YAxis
          yAxisId="pitch"
          orientation="right"
          domain={[0, maxPitch]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={pitchAxisWidth}
          hide={isMobile}
          tickFormatter={(v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v))}` : '')}
        />

        {/* Playback progress background - using Area component for reliable rendering */}
        {currentTimeRelative !== undefined &&
          Number.isFinite(currentTimeRelative) &&
          currentTimeRelative > 0 && (
            <Area
              yAxisId="pitch"
              type="stepAfter"
              dataKey="progressBg"
              baseValue={0}
              fill="var(--color-pitch-progress)"
              fillOpacity={0.15}
              stroke="none"
              isAnimationActive={false}
              dot={false}
              connectNulls={false}
              name="progress"
              legendType="none"
            />
          )}

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                // Hide progress in tooltip
                if (name === 'progress') {
                  return null
                }
                if (name === 'ampRef' || name === 'ampUser') {
                  const num = typeof value === 'number' ? value : Number(value)
                  return [
                    Number.isFinite(num) ? num.toFixed(2) : '-',
                    (chartConfig as any)[name]?.label ?? name,
                  ]
                }
                if (name === 'pitchRefHz' || name === 'pitchUserHz') {
                  const num = typeof value === 'number' ? value : Number(value)
                  return [
                    Number.isFinite(num) ? `${Math.round(num)} Hz` : '-',
                    (chartConfig as any)[name]?.label ?? name,
                  ]
                }
                return [String(value ?? ''), (chartConfig as any)[name]?.label ?? name]
              }}
            />
          }
        />

        {/* Waveform envelope (reference) - background layer, subtle */}
        {vis.showWaveform && vis.showReference && (
          <Line
            yAxisId="amp"
            type="monotone"
            dataKey="ampRef"
            stroke="var(--color-pitch-reference-amplitude)"
            strokeWidth={0.5}
            strokeOpacity={0.25}
            isAnimationActive={false}
            dot={false}
            name="ampRef"
          />
        )}

        {/* Pitch contour (reference) - foreground layer, prominent */}
        {vis.showReference && (
          <Area
            yAxisId="pitch"
            type="monotone"
            dataKey="pitchRefHz"
            baseValue={0}
            stroke="var(--color-pitch-reference)"
            fill="var(--color-pitch-reference)"
            fillOpacity={0.35}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={false}
            connectNulls={false}
            name="pitchRefHz"
          />
        )}

        {hasUser && vis.showUser && (
          <>
            {/* User waveform - background layer */}
            {vis.showWaveform && (
              <Line
                yAxisId="amp"
                type="monotone"
                dataKey="ampUser"
                stroke="var(--color-pitch-recording-amplitude)"
                strokeWidth={0.5}
                strokeOpacity={0.2}
                isAnimationActive={false}
                dot={false}
                name="ampUser"
              />
            )}
            {/* User pitch - foreground layer */}
            <Area
              yAxisId="pitch"
              type="monotone"
              dataKey="pitchUserHz"
              baseValue={0}
              stroke="var(--color-pitch-recording)"
              fill="var(--color-pitch-recording)"
              fillOpacity={0.25}
              strokeWidth={2}
              isAnimationActive={false}
              dot={false}
              connectNulls={false}
              name="pitchUserHz"
            />
          </>
        )}
      </AreaChart>
    </ChartContainer>
  )
}


