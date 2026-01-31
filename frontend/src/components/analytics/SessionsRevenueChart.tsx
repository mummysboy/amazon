import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SessionsRevenuePoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface SessionsRevenueChartProps {
  data: SessionsRevenuePoint[]
  isLoading: boolean
  comparisonData?: SessionsRevenuePoint[]
  compareMode?: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SessionsRevenueChart({ data, isLoading, comparisonData, compareMode }: SessionsRevenueChartProps) {
  const chartData = compareMode && comparisonData
    ? data.map((d, index) => ({
        dayLabel: `Day ${index + 1}`,
        'Sessions (A)': d.sessions,
        'Revenue (A)': d.revenue,
        'Sessions (B)': comparisonData[index]?.sessions ?? null,
        'Revenue (B)': comparisonData[index]?.revenue ?? null,
      }))
    : data.map((d) => ({
        date: formatDate(d.date),
        Sessions: d.sessions,
        Revenue: d.revenue,
      }))

  return (
    <ChartCard
      title="Sessions vs Revenue"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No traffic data available. Upload daily sales reports to see this chart."
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={compareMode ? 'dayLabel' : 'date'} tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value === null) return '-'
              const strName = String(name)
              return strName.includes('Revenue') ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString()
            }}
          />
          <Legend />
          {compareMode && comparisonData ? (
            <>
              {/* Period A - Solid lines */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Sessions (A)"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                name="Sessions (A)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Revenue (A)"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Revenue (A)"
              />
              {/* Period B - Dashed lines */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Sessions (B)"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Sessions (B)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Revenue (B)"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Revenue (B)"
              />
            </>
          ) : (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Sessions"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Revenue"
                stroke="#10B981"
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
