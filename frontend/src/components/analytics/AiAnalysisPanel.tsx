import type { AiAnalysisResponse, AiInsight, AiRecommendation } from '../../types/ai'

interface AiAnalysisPanelProps {
  isOpen: boolean
  onClose: () => void
  data: AiAnalysisResponse | null
  isLoading: boolean
  error: Error | null
}

const severityColors: Record<AiInsight['severity'], { bg: string; border: string; text: string }> = {
  positive: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  neutral: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
}

const priorityColors: Record<AiRecommendation['priority'], { bg: string; text: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { bg: 'bg-blue-100', text: 'text-blue-700' },
}

const categoryIcons: Record<AiInsight['category'], string> = {
  tacos: 'T',
  revenue: '$',
  spend: '-',
  efficiency: '%',
  opportunity: '+',
}

export function AiAnalysisPanel({ isOpen, onClose, data, isLoading, error }: AiAnalysisPanelProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-4xl bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Performance Analysis</h2>
                  {data?.generatedAt && (
                    <p className="text-sm text-purple-200">
                      Generated {new Date(data.generatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-purple-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Analyzing your performance data...</p>
                <p className="text-sm text-gray-400">This may take a moment</p>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Analysis Failed</h3>
                <p className="mt-2 text-gray-600">{error.message}</p>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                  <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wider mb-2">
                    Executive Summary
                  </h3>
                  <p className="text-gray-700">{data.summary}</p>
                </div>

                {/* Key Metrics Comparison */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Metric</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Period A</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Period B</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <MetricRow
                        label="Total Revenue"
                        valueA={`$${data.metrics.periodA.totalRevenue.toLocaleString()}`}
                        valueB={`$${data.metrics.periodB.totalRevenue.toLocaleString()}`}
                        change={data.metrics.changes.revenue}
                      />
                      <MetricRow
                        label="Ad Spend"
                        valueA={`$${data.metrics.periodA.totalAdSpend.toLocaleString()}`}
                        valueB={`$${data.metrics.periodB.totalAdSpend.toLocaleString()}`}
                        change={data.metrics.changes.adSpend}
                        invertColor
                      />
                      <MetricRow
                        label="Avg TACOS"
                        valueA={`${data.metrics.periodA.avgTacos.toFixed(2)}%`}
                        valueB={`${data.metrics.periodB.avgTacos.toFixed(2)}%`}
                        change={data.metrics.changes.tacos}
                        invertColor
                      />
                      <MetricRow
                        label="Wasted Spend"
                        valueA={`$${data.metrics.periodA.wastedSpend.toLocaleString()}`}
                        valueB={`$${data.metrics.periodB.wastedSpend.toLocaleString()}`}
                        change={data.metrics.changes.wastedSpend}
                        invertColor
                      />
                      <MetricRow
                        label="Organic Sales"
                        valueA={`$${data.metrics.periodA.organicSales.toLocaleString()}`}
                        valueB={`$${data.metrics.periodB.organicSales.toLocaleString()}`}
                        change={data.metrics.changes.organicSales}
                      />
                      <MetricRow
                        label="Ad-Attributed Sales"
                        valueA={`$${data.metrics.periodA.adAttributedSales.toLocaleString()}`}
                        valueB={`$${data.metrics.periodB.adAttributedSales.toLocaleString()}`}
                        change={data.metrics.changes.adAttributedSales}
                      />
                    </tbody>
                  </table>
                </div>

                {/* Insights */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h3>
                  <div className="space-y-3">
                    {data.insights.map((insight, index) => (
                      <InsightCard key={index} insight={insight} />
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
                  <div className="space-y-3">
                    {data.recommendations.map((rec, index) => (
                      <RecommendationCard key={index} recommendation={rec} index={index + 1} />
                    ))}
                  </div>
                </div>

                {/* Top/Bottom SKUs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">Top Performing SKUs</h4>
                    <ul className="space-y-1">
                      {data.metrics.topPerformingSkus.map((sku, i) => (
                        <li key={i} className="text-sm text-green-700 font-mono">{sku}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">Underperforming SKUs</h4>
                    <ul className="space-y-1">
                      {data.metrics.underPerformingSkus.map((sku, i) => (
                        <li key={i} className="text-sm text-red-700 font-mono">{sku}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricRow({
  label,
  valueA,
  valueB,
  change,
  invertColor = false
}: {
  label: string
  valueA: string
  valueB: string
  change: number
  invertColor?: boolean
}) {
  const isPositive = invertColor ? change < 0 : change > 0
  const isNegative = invertColor ? change > 0 : change < 0

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-3 font-medium text-gray-900">{label}</td>
      <td className="py-2 px-3 text-right text-gray-900">{valueA}</td>
      <td className="py-2 px-3 text-right text-gray-500">{valueB}</td>
      <td className={`py-2 px-3 text-right font-medium ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
      }`}>
        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
      </td>
    </tr>
  )
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const colors = severityColors[insight.severity]
  const icon = categoryIcons[insight.category]

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 ${colors.bg} border ${colors.border} rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className={`text-sm font-bold ${colors.text}`}>{icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold ${colors.text}`}>{insight.title}</h4>
            {insight.change !== undefined && insight.change !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                insight.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          {insight.metric && (
            <p className="text-xs text-gray-500 mt-1">
              Metric: <span className="font-medium">{insight.metric}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, index }: { recommendation: AiRecommendation; index: number }) {
  const colors = priorityColors[recommendation.priority]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-gray-600">{index}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{recommendation.action}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} capitalize`}>
              {recommendation.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{recommendation.rationale}</p>
          {recommendation.expectedImpact && (
            <p className="text-xs text-purple-600 mt-2 font-medium">
              Expected Impact: {recommendation.expectedImpact}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
