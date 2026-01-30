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
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TacosChart({ data, isLoading }: TacosChartProps) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    TACOS: d.tacos,
  }))

  const avgTacos = data.length > 0
    ? data.reduce((sum, d) => sum + d.tacos, 0) / data.length
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
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'TACOS']}
          />
          <Legend />
          <ReferenceLine
            y={avgTacos}
            stroke="#94A3B8"
            strokeDasharray="5 5"
            label={{ value: `Avg: ${avgTacos.toFixed(1)}%`, fontSize: 11, fill: '#64748B' }}
          />
          <Line
            type="monotone"
            dataKey="TACOS"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
