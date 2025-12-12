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
  ChartLegend,
  ChartLegendContent,
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

export function PitchContourChart({
  data,
  className,
  labels,
}: {
  data: EchoRegionSeriesPoint[]
  className?: string
  labels: {
    waveform: string
    pitch: string
    yourWaveform: string
    yourPitch: string
  }
}) {
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

  return (
    <ChartContainer className={className} config={chartConfig}>
      <AreaChart data={data} margin={margin}>
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
          domain={[0, 'dataMax']}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={pitchAxisWidth}
          hide={isMobile}
          tickFormatter={(v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v))}` : '')}
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
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

        <ChartLegend content={<ChartLegendContent />} />

        {/* Waveform envelope (reference) - background layer, subtle */}
        <Line
          yAxisId="amp"
          type="monotone"
          dataKey="ampRef"
          stroke="var(--color-ampRef)"
          strokeWidth={0.5}
          strokeOpacity={0.25}
          isAnimationActive={false}
          dot={false}
          name="ampRef"
        />

        {/* Pitch contour (reference) - foreground layer, prominent */}
        <Area
          yAxisId="pitch"
          type="monotone"
          dataKey="pitchRefHz"
          baseValue={0}
          stroke="var(--color-pitchRefHz)"
          fill="var(--color-pitchRefHz)"
          fillOpacity={0.35}
          strokeWidth={2.5}
          isAnimationActive={false}
          dot={false}
          connectNulls={false}
          name="pitchRefHz"
        />

        {hasUser && (
          <>
            {/* User waveform - background layer */}
            <Line
              yAxisId="amp"
              type="monotone"
              dataKey="ampUser"
              stroke="var(--color-ampUser)"
              strokeWidth={0.5}
              strokeOpacity={0.2}
              isAnimationActive={false}
              dot={false}
              name="ampUser"
            />
            {/* User pitch - foreground layer */}
            <Area
              yAxisId="pitch"
              type="monotone"
              dataKey="pitchUserHz"
              baseValue={0}
              stroke="var(--color-pitchUserHz)"
              fill="var(--color-pitchUserHz)"
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


