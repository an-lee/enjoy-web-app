import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
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

  return (
    <ChartContainer className={className} config={chartConfig}>
      <AreaChart data={data} margin={{ left: 10, right: 16, top: 10, bottom: 6 }}>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) => formatSecondsShort(Number(v))}
        />

        <YAxis
          yAxisId="amp"
          domain={[0, 1]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={36}
        />

        <YAxis
          yAxisId="pitch"
          orientation="right"
          domain={[0, 'dataMax']}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
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
        <Area
          yAxisId="amp"
          type="monotone"
          dataKey="ampRef"
          baseValue={0}
          stroke="var(--color-ampRef)"
          fill="var(--color-ampRef)"
          fillOpacity={0.12}
          strokeWidth={1}
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
            <Area
              yAxisId="amp"
              type="monotone"
              dataKey="ampUser"
              baseValue={0}
              stroke="var(--color-ampUser)"
              fill="var(--color-ampUser)"
              fillOpacity={0.1}
              strokeWidth={1}
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


