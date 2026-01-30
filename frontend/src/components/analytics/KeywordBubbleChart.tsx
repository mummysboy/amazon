import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts'
import type { KeywordBubblePoint } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface KeywordBubbleChartProps {
  data: KeywordBubblePoint[]
  isLoading: boolean
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: KeywordBubblePoint }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{data.keywordText}</p>
        <p className="text-sm text-gray-600">Spend: ${data.spend.toLocaleString()}</p>
        <p className="text-sm text-gray-600">Orders: {data.orders}</p>
        <p className="text-sm text-gray-600">Impressions: {data.impressions.toLocaleString()}</p>
        <p className="text-sm text-gray-600">ACOS: {data.acos.toFixed(1)}%</p>
        <p className="text-sm text-gray-600">CTR: {data.ctr.toFixed(2)}%</p>
        <p className={`text-sm ${data.isBranded ? 'text-blue-600' : 'text-gray-600'}`}>
          {data.isBranded ? 'Branded' : 'Non-Branded'}
        </p>
      </div>
    )
  }
  return null
}

export function KeywordBubbleChart({ data, isLoading }: KeywordBubbleChartProps) {
  const brandedData = data.filter((d) => d.isBranded)
  const nonBrandedData = data.filter((d) => !d.isBranded)

  // Scale impressions for bubble size
  const maxImpressions = Math.max(...data.map((d) => d.impressions), 1)
  const scaleImpressions = (impressions: number) => {
    return Math.max(50, (impressions / maxImpressions) * 500)
  }

  const brandedWithSize = brandedData.map((d) => ({
    ...d,
    z: scaleImpressions(d.impressions),
  }))

  const nonBrandedWithSize = nonBrandedData.map((d) => ({
    ...d,
    z: scaleImpressions(d.impressions),
  }))

  return (
    <ChartCard
      title="Keyword Performance"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No keyword data available. Upload advertising reports with keyword data."
    >
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="spend"
            type="number"
            name="Spend"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
            label={{ value: 'Ad Spend ($)', position: 'bottom', fontSize: 12 }}
          />
          <YAxis
            dataKey="orders"
            type="number"
            name="Orders"
            tick={{ fontSize: 12 }}
            label={{ value: 'Orders', angle: -90, position: 'left', fontSize: 12 }}
          />
          <ZAxis dataKey="z" range={[50, 500]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Scatter name="Branded" data={brandedWithSize} fill="#3B82F6" />
          <Scatter name="Non-Branded" data={nonBrandedWithSize} fill="#10B981" />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
