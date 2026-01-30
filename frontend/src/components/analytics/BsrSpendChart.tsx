import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { BsrSpendPoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface BsrSpendChartProps {
  data: BsrSpendPoint[]
  isLoading: boolean
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: BsrSpendPoint }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{data.asin}</p>
        {data.sku && <p className="text-sm text-gray-600">SKU: {data.sku}</p>}
        <p className="text-sm text-gray-600">BSR: #{data.categoryRank.toLocaleString()}</p>
        <p className="text-sm text-gray-600">Category: {data.categoryName}</p>
        <p className="text-sm text-gray-600">Ad Spend: ${data.adSpend.toLocaleString()}</p>
        <p className="text-sm text-gray-600">Ad Sales: ${data.adSales.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export function BsrSpendChart({ data, isLoading }: BsrSpendChartProps) {
  // Use log scale for BSR since ranks vary widely
  const chartData = data.map((d) => ({
    ...d,
    logRank: Math.log10(Math.max(d.categoryRank, 1)),
  }))

  const avgSpend = data.length > 0
    ? data.reduce((sum, d) => sum + d.adSpend, 0) / data.length
    : 0

  return (
    <ChartCard
      title="BSR vs Ad Spend"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No BSR data available. Upload SKU rankings and advertising data."
    >
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="adSpend"
            type="number"
            name="Ad Spend"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
            label={{ value: 'Ad Spend ($)', position: 'bottom', fontSize: 12 }}
          />
          <YAxis
            dataKey="categoryRank"
            type="number"
            name="BSR"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `#${v.toLocaleString()}`}
            label={{ value: 'Best Seller Rank', angle: -90, position: 'left', fontSize: 12 }}
            reversed
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={avgSpend}
            stroke="#94A3B8"
            strokeDasharray="5 5"
            label={{ value: 'Avg Spend', fontSize: 10, fill: '#64748B' }}
          />
          <Scatter name="Products" data={chartData} fill="#8B5CF6" />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
