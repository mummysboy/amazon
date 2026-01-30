import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { GrowthDecomposition } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface GrowthWaterfallChartProps {
  data: GrowthDecomposition | undefined
  isLoading: boolean
}

export function GrowthWaterfallChart({ data, isLoading }: GrowthWaterfallChartProps) {
  if (!data) {
    return (
      <ChartCard
        title="Growth Decomposition"
        isLoading={isLoading}
        isEmpty={true}
        emptyMessage="Not enough data to compare periods. Upload more historical data."
      >
        <div />
      </ChartCard>
    )
  }

  // Build waterfall data
  const waterfallData = [
    {
      name: 'Previous',
      value: data.baselineRevenue,
      cumulative: data.baselineRevenue,
      isTotal: true,
    },
    {
      name: 'Traffic',
      value: data.trafficContribution,
      cumulative: data.baselineRevenue + data.trafficContribution,
      isTotal: false,
    },
    {
      name: 'Conversion',
      value: data.conversionContribution,
      cumulative: data.baselineRevenue + data.trafficContribution + data.conversionContribution,
      isTotal: false,
    },
    {
      name: 'Ad Revenue',
      value: data.adContribution,
      cumulative:
        data.baselineRevenue +
        data.trafficContribution +
        data.conversionContribution +
        data.adContribution,
      isTotal: false,
    },
    {
      name: 'Organic',
      value: data.organicContribution,
      cumulative: data.finalRevenue,
      isTotal: false,
    },
    {
      name: 'Current',
      value: data.finalRevenue,
      cumulative: data.finalRevenue,
      isTotal: true,
    },
  ]

  // Calculate bar positions for waterfall effect
  const chartData = waterfallData.map((d, i) => {
    if (d.isTotal) {
      return {
        name: d.name,
        value: d.value,
        base: 0,
        fill: d.name === 'Previous' ? '#94A3B8' : '#3B82F6',
      }
    }
    const prevCumulative = waterfallData[i - 1].cumulative
    return {
      name: d.name,
      value: Math.abs(d.value),
      base: d.value >= 0 ? prevCumulative : prevCumulative - Math.abs(d.value),
      fill: d.value >= 0 ? '#10B981' : '#EF4444',
    }
  })

  const changeText =
    data.percentChange >= 0
      ? `+${data.percentChange.toFixed(1)}%`
      : `${data.percentChange.toFixed(1)}%`

  return (
    <ChartCard
      title="Growth Decomposition"
      isLoading={isLoading}
      isEmpty={false}
    >
      <div className="mb-4">
        <span className="text-sm text-gray-500">Period Change: </span>
        <span
          className={`font-semibold ${
            data.percentChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {changeText}
        </span>
        <span className="text-sm text-gray-400 ml-2">
          (${data.baselineRevenue.toLocaleString()} to ${data.finalRevenue.toLocaleString()})
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value) => `$${Number(value).toLocaleString()}`}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <ReferenceLine y={0} stroke="#000" />
          <Bar dataKey="value" stackId="a">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
          <Bar dataKey="base" stackId="a" fill="transparent" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-gray-400 rounded" /> Previous/Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded" /> Positive
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" /> Negative
        </span>
      </div>
    </ChartCard>
  )
}
