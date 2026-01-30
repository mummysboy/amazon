import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { SkuTacosData } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface SkuTacosGridProps {
  data: SkuTacosData[]
  isLoading: boolean
}

function MiniTacosChart({ dataPoints }: { dataPoints: { date: string; tacos: number }[] }) {
  const chartData = dataPoints.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tacos: d.tacos,
  }))

  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={chartData}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={[0, 'auto']} />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'TACOS']}
          labelStyle={{ fontSize: 10 }}
          contentStyle={{ fontSize: 10, padding: '4px 8px' }}
        />
        <Line
          type="monotone"
          dataKey="tacos"
          stroke="#F59E0B"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SkuTacosGrid({ data, isLoading }: SkuTacosGridProps) {
  return (
    <ChartCard
      title="Top 10 SKUs by Ad Spend - TACOS Trends"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No SKU data available. Upload SKU-campaign mappings and advertising data."
      className="col-span-2"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {data.map((sku, index) => (
          <div key={sku.sku} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  sku.tacos <= 15
                    ? 'bg-green-100 text-green-700'
                    : sku.tacos <= 25
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {sku.tacos.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate" title={sku.sku}>
              {sku.sku}
            </p>
            {sku.productName && (
              <p className="text-xs text-gray-500 truncate" title={sku.productName}>
                {sku.productName.length > 30
                  ? sku.productName.substring(0, 30) + '...'
                  : sku.productName}
              </p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              <span>Spend: ${sku.adSpend.toLocaleString()}</span>
            </div>
            <div className="mt-2">
              <MiniTacosChart dataPoints={sku.dataPoints} />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
