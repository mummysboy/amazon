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
  comparisonData?: BrandedSpendPoint[]
  compareMode?: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function BrandedSpendChart({ data, isLoading, comparisonData, compareMode }: BrandedSpendChartProps) {
  const chartData = compareMode && comparisonData
    ? data.map((d, index) => ({
        dayLabel: `Day ${index + 1}`,
        'Branded Spend (A)': d.brandedSpend,
        'Non-Branded Spend (A)': d.nonBrandedSpend,
        'Branded Spend (B)': comparisonData[index]?.brandedSpend ?? null,
        'Non-Branded Spend (B)': comparisonData[index]?.nonBrandedSpend ?? null,
      }))
    : data.map((d) => ({
        date: formatDate(d.date),
        'Branded Spend': d.brandedSpend,
        'Non-Branded Spend': d.nonBrandedSpend,
      }))

  const totalBrandedA = data.reduce((sum, d) => sum + d.brandedSpend, 0)
  const totalNonBrandedA = data.reduce((sum, d) => sum + d.nonBrandedSpend, 0)
  const totalA = totalBrandedA + totalNonBrandedA
  const brandedPctA = totalA > 0 ? (totalBrandedA / totalA) * 100 : 0

  const totalBrandedB = comparisonData?.reduce((sum, d) => sum + d.brandedSpend, 0) || 0
  const totalNonBrandedB = comparisonData?.reduce((sum, d) => sum + d.nonBrandedSpend, 0) || 0
  const totalB = totalBrandedB + totalNonBrandedB
  const brandedPctB = totalB > 0 ? (totalBrandedB / totalB) * 100 : 0

  return (
    <ChartCard
      title="Branded vs Non-Branded Spend"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No keyword data available. Add brand keywords and upload advertising data."
    >
      <div className="mb-4 flex gap-6 flex-wrap">
        {compareMode && comparisonData ? (
          <>
            <div className="border-r pr-6">
              <div className="text-xs text-gray-500 mb-1">Period A</div>
              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-gray-500">Branded: </span>
                  <span className="font-semibold text-blue-600">${totalBrandedA.toLocaleString()}</span>
                  <span className="text-sm text-gray-400"> ({brandedPctA.toFixed(1)}%)</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Non-Branded: </span>
                  <span className="font-semibold text-green-600">${totalNonBrandedA.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Period B</div>
              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-gray-500">Branded: </span>
                  <span className="font-semibold text-blue-400">${totalBrandedB.toLocaleString()}</span>
                  <span className="text-sm text-gray-400"> ({brandedPctB.toFixed(1)}%)</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Non-Branded: </span>
                  <span className="font-semibold text-green-400">${totalNonBrandedB.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="text-sm text-gray-500">Branded: </span>
              <span className="font-semibold text-blue-600">${totalBrandedA.toLocaleString()}</span>
              <span className="text-sm text-gray-400"> ({brandedPctA.toFixed(1)}%)</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Non-Branded: </span>
              <span className="font-semibold text-green-600">${totalNonBrandedA.toLocaleString()}</span>
              <span className="text-sm text-gray-400"> ({(100 - brandedPctA).toFixed(1)}%)</span>
            </div>
          </>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={compareMode ? 'dayLabel' : 'date'} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => value !== null ? `$${Number(value).toLocaleString()}` : '-'} />
          <Legend />
          {compareMode && comparisonData ? (
            <>
              {/* Period A - Solid lines */}
              <Line
                type="monotone"
                dataKey="Branded Spend (A)"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Branded (A)"
              />
              <Line
                type="monotone"
                dataKey="Non-Branded Spend (A)"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Non-Branded (A)"
              />
              {/* Period B - Dashed lines */}
              <Line
                type="monotone"
                dataKey="Branded Spend (B)"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Branded (B)"
              />
              <Line
                type="monotone"
                dataKey="Non-Branded Spend (B)"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Non-Branded (B)"
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
