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
  comparisonData?: SalesBreakdownPoint[]
  compareMode?: boolean
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SalesBreakdownChart({ data, isLoading, comparisonData, compareMode }: SalesBreakdownChartProps) {
  const chartData = compareMode && comparisonData
    ? data.map((d, index) => ({
        dayLabel: `Day ${index + 1}`,
        'Total Sales (A)': d.totalSales,
        'Ad Spend (A)': d.adSpend,
        'Ad Attributed (A)': d.adAttributedSales,
        'Organic Sales (A)': d.organicSales,
        'Total Sales (B)': comparisonData[index]?.totalSales ?? null,
        'Ad Spend (B)': comparisonData[index]?.adSpend ?? null,
        'Ad Attributed (B)': comparisonData[index]?.adAttributedSales ?? null,
        'Organic Sales (B)': comparisonData[index]?.organicSales ?? null,
      }))
    : data.map((d) => ({
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
          <XAxis dataKey={compareMode ? 'dayLabel' : 'date'} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
          <Tooltip formatter={(value) => value !== null ? formatCurrency(Number(value)) : '-'} />
          <Legend />
          {compareMode && comparisonData ? (
            <>
              {/* Period A - Solid lines */}
              <Line
                type="monotone"
                dataKey="Total Sales (A)"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Total Sales (A)"
              />
              <Line
                type="monotone"
                dataKey="Ad Spend (A)"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                name="Ad Spend (A)"
              />
              <Line
                type="monotone"
                dataKey="Ad Attributed (A)"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Ad Attributed (A)"
              />
              <Line
                type="monotone"
                dataKey="Organic Sales (A)"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                name="Organic (A)"
              />
              {/* Period B - Dashed lines */}
              <Line
                type="monotone"
                dataKey="Total Sales (B)"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Total Sales (B)"
              />
              <Line
                type="monotone"
                dataKey="Ad Spend (B)"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Ad Spend (B)"
              />
              <Line
                type="monotone"
                dataKey="Ad Attributed (B)"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Ad Attributed (B)"
              />
              <Line
                type="monotone"
                dataKey="Organic Sales (B)"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                name="Organic (B)"
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
