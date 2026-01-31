import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { TacosPoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface TacosChartProps {
  data: TacosPoint[]
  isLoading: boolean
  comparisonData?: TacosPoint[]
  compareMode?: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TacosChart({ data, isLoading, comparisonData, compareMode }: TacosChartProps) {
  const chartData = compareMode && comparisonData
    ? data.map((d, index) => ({
        dayLabel: `Day ${index + 1}`,
        'TACOS (A)': d.tacos,
        'TACOS (B)': comparisonData[index]?.tacos ?? null,
      }))
    : data.map((d) => ({
        date: formatDate(d.date),
        TACOS: d.tacos,
      }))

  const avgTacosA = data.length > 0
    ? data.reduce((sum, d) => sum + d.tacos, 0) / data.length
    : 0

  const avgTacosB = comparisonData && comparisonData.length > 0
    ? comparisonData.reduce((sum, d) => sum + d.tacos, 0) / comparisonData.length
    : 0

  return (
    <ChartCard
      title="TACOS Over Time"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No data available. Upload sales and advertising reports to see TACOS."
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={compareMode ? 'dayLabel' : 'date'} tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(value) => value !== null ? [`${Number(value).toFixed(2)}%`] : ['-']}
          />
          <Legend />
          {compareMode && comparisonData ? (
            <>
              <ReferenceLine
                y={avgTacosA}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{ value: `A Avg: ${avgTacosA.toFixed(1)}%`, fontSize: 10, fill: '#F59E0B' }}
              />
              <ReferenceLine
                y={avgTacosB}
                stroke="#94A3B8"
                strokeDasharray="5 5"
                label={{ value: `B Avg: ${avgTacosB.toFixed(1)}%`, fontSize: 10, fill: '#94A3B8' }}
              />
              <Line
                type="monotone"
                dataKey="TACOS (A)"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                name="Period A"
              />
              <Line
                type="monotone"
                dataKey="TACOS (B)"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Period B"
              />
            </>
          ) : (
            <>
              <ReferenceLine
                y={avgTacosA}
                stroke="#94A3B8"
                strokeDasharray="5 5"
                label={{ value: `Avg: ${avgTacosA.toFixed(1)}%`, fontSize: 11, fill: '#64748B' }}
              />
              <Line
                type="monotone"
                dataKey="TACOS"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
