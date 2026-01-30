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
import type { SalesBreakdownPoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface SalesBreakdownChartProps {
  data: SalesBreakdownPoint[]
  isLoading: boolean
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SalesBreakdownChart({ data, isLoading }: SalesBreakdownChartProps) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    'Total Sales': d.totalSales,
    'Ad Spend': d.adSpend,
    'Ad Attributed': d.adAttributedSales,
    'Organic Sales': d.organicSales,
  }))

  return (
    <ChartCard
      title="Total Sales vs Ad Spend vs Attributed vs Organic"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No sales data available. Upload daily sales reports to see this chart."
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Total Sales"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Ad Spend"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Ad Attributed"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Organic Sales"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
