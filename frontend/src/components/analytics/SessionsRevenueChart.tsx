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
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SessionsRevenueChart({ data, isLoading }: SessionsRevenueChartProps) {
  const chartData = data.map((d) => ({
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
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
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
            formatter={(value, name) =>
              name === 'Revenue' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString()
            }
          />
          <Legend />
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
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
