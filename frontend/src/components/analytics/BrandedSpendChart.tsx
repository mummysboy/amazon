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
import type { BrandedSpendPoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface BrandedSpendChartProps {
  data: BrandedSpendPoint[]
  isLoading: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function BrandedSpendChart({ data, isLoading }: BrandedSpendChartProps) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    'Branded Spend': d.brandedSpend,
    'Non-Branded Spend': d.nonBrandedSpend,
  }))

  const totalBranded = data.reduce((sum, d) => sum + d.brandedSpend, 0)
  const totalNonBranded = data.reduce((sum, d) => sum + d.nonBrandedSpend, 0)
  const total = totalBranded + totalNonBranded
  const brandedPct = total > 0 ? (totalBranded / total) * 100 : 0

  return (
    <ChartCard
      title="Branded vs Non-Branded Spend"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No keyword data available. Add brand keywords and upload advertising data."
    >
      <div className="mb-4 flex gap-6">
        <div>
          <span className="text-sm text-gray-500">Branded: </span>
          <span className="font-semibold text-blue-600">${totalBranded.toLocaleString()}</span>
          <span className="text-sm text-gray-400"> ({brandedPct.toFixed(1)}%)</span>
        </div>
        <div>
          <span className="text-sm text-gray-500">Non-Branded: </span>
          <span className="font-semibold text-green-600">${totalNonBranded.toLocaleString()}</span>
          <span className="text-sm text-gray-400"> ({(100 - brandedPct).toFixed(1)}%)</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Branded Spend"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Non-Branded Spend"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
