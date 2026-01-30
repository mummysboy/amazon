import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { WastedSpendData } from '../../types/analytics'
import { ChartCard } from './ChartCard'

interface WastedSpendChartProps {
  data: WastedSpendData | undefined
  isLoading: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WastedSpendChart({ data, isLoading }: WastedSpendChartProps) {
  if (!data) {
    return (
      <ChartCard
        title="Wasted Spend"
        isLoading={isLoading}
        isEmpty={true}
        emptyMessage="No advertising data available."
      >
        <div />
      </ChartCard>
    )
  }

  const chartData = data.daily.map((d) => ({
    date: formatDate(d.date),
    'Wasted Spend': d.totalWastedSpend,
    'Keywords': d.keywordCount,
  }))

  const totalWasted = data.daily.reduce((sum, d) => sum + d.totalWastedSpend, 0)
  const totalKeywords = data.keywords.length

  return (
    <ChartCard
      title="Wasted Spend"
      isLoading={isLoading}
      isEmpty={data.daily.length === 0}
      emptyMessage="No wasted spend found. Either no keywords meet the criteria or all keywords are converting."
    >
      <div className="mb-4 flex gap-6">
        <div>
          <span className="text-sm text-gray-500">Total Wasted: </span>
          <span className="font-semibold text-red-600">${totalWasted.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-sm text-gray-500">Keywords: </span>
          <span className="font-semibold text-gray-900">{totalKeywords}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) =>
              name === 'Wasted Spend' ? `$${Number(value).toLocaleString()}` : Number(value)
            }
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="Wasted Spend"
            fill="#EF4444"
            opacity={0.8}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Keywords"
            stroke="#6366F1"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {data.keywords.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Top Wasted Keywords</h4>
          <div className="max-h-32 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-1 px-2">Keyword</th>
                  <th className="text-right py-1 px-2">Spend</th>
                  <th className="text-right py-1 px-2">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.slice(0, 10).map((kw) => (
                  <tr key={kw.keywordText} className="border-t border-gray-100">
                    <td className="py-1 px-2 truncate max-w-[150px]" title={kw.keywordText}>
                      {kw.keywordText}
                    </td>
                    <td className="py-1 px-2 text-right text-red-600">
                      ${kw.totalSpend.toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-right">{kw.totalClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ChartCard>
  )
}
