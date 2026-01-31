import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { DateRange, ComparisonConfig } from '../types/analytics'
import {
  useSalesBreakdown,
  useTacosTrend,
  useSessionsRevenue,
  useKeywordPerformance,
  useBrandedSpend,
  useBsrVsSpend,
  useTopSkuTacos,
  useGrowthDecomposition,
  useWastedSpend,
  useBrandKeywords,
  useAddBrandKeyword,
  useRemoveBrandKeyword,
  getDateRangeFromPreset,
  getGrowthPeriods,
  useSalesBreakdownComparison,
  useTacosTrendComparison,
  useSessionsRevenueComparison,
  useBrandedSpendComparison,
  useWastedSpendComparison,
} from '../hooks/useAnalytics'
import { useAiAnalysis } from '../hooks/useAiAnalysis'

import { DateRangeFilter } from '../components/analytics/DateRangeFilter'
import { SalesBreakdownChart } from '../components/analytics/SalesBreakdownChart'
import { TacosChart } from '../components/analytics/TacosChart'
import { SessionsRevenueChart } from '../components/analytics/SessionsRevenueChart'
import { KeywordBubbleChart } from '../components/analytics/KeywordBubbleChart'
import { BrandedSpendChart } from '../components/analytics/BrandedSpendChart'
import { BsrSpendChart } from '../components/analytics/BsrSpendChart'
import { SkuTacosGrid } from '../components/analytics/SkuTacosGrid'
import { GrowthWaterfallChart } from '../components/analytics/GrowthWaterfallChart'
import { WastedSpendChart } from '../components/analytics/WastedSpendChart'
import { AiAnalysisPanel } from '../components/analytics/AiAnalysisPanel'

interface Client {
  id: string
  name: string
}

export function AnalyticsPage() {
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30d'))
  const [newBrandKeyword, setNewBrandKeyword] = useState('')
  const [showBrandSettings, setShowBrandSettings] = useState(false)
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig>({ enabled: false })
  const [showAiPanel, setShowAiPanel] = useState(false)

  // Get growth period from date range
  const growthPeriod = useMemo(() => getGrowthPeriods(dateRange), [dateRange])

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/clients')
      return data
    },
  })

  // Analytics queries (non-comparison mode)
  const salesBreakdown = useSalesBreakdown(selectedClient, dateRange)
  const tacosTrend = useTacosTrend(selectedClient, dateRange)
  const sessionsRevenue = useSessionsRevenue(selectedClient, dateRange)
  const keywordPerformance = useKeywordPerformance(selectedClient, dateRange)
  const brandedSpend = useBrandedSpend(selectedClient, dateRange)
  const bsrVsSpend = useBsrVsSpend(selectedClient, dateRange)
  const topSkuTacos = useTopSkuTacos(selectedClient, dateRange)
  const growthDecomposition = useGrowthDecomposition(selectedClient, growthPeriod)
  const wastedSpend = useWastedSpend(selectedClient, dateRange)

  // Comparison queries
  const salesBreakdownComparison = useSalesBreakdownComparison(selectedClient, dateRange, comparisonConfig)
  const tacosTrendComparison = useTacosTrendComparison(selectedClient, dateRange, comparisonConfig)
  const sessionsRevenueComparison = useSessionsRevenueComparison(selectedClient, dateRange, comparisonConfig)
  const brandedSpendComparison = useBrandedSpendComparison(selectedClient, dateRange, comparisonConfig)
  const wastedSpendComparison = useWastedSpendComparison(selectedClient, dateRange, comparisonConfig)

  // AI Analysis mutation
  const aiAnalysis = useAiAnalysis(selectedClient)

  // Brand keywords management
  const brandKeywords = useBrandKeywords(selectedClient)
  const addBrandKeyword = useAddBrandKeyword(selectedClient)
  const removeBrandKeyword = useRemoveBrandKeyword(selectedClient)

  const handleAddBrandKeyword = () => {
    if (newBrandKeyword.trim()) {
      addBrandKeyword.mutate(newBrandKeyword.trim())
      setNewBrandKeyword('')
    }
  }

  const handleGetAiInsights = () => {
    // Calculate previous period if comparison not enabled
    const periodB = comparisonConfig.enabled && comparisonConfig.periodB
      ? comparisonConfig.periodB
      : (() => {
          const startDate = new Date(dateRange.startDate)
          const endDate = new Date(dateRange.endDate)
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          const prevEnd = new Date(startDate)
          prevEnd.setDate(prevEnd.getDate() - 1)
          const prevStart = new Date(prevEnd)
          prevStart.setDate(prevStart.getDate() - daysDiff)
          return {
            startDate: prevStart.toISOString().split('T')[0],
            endDate: prevEnd.toISOString().split('T')[0],
          }
        })()

    setShowAiPanel(true)
    aiAnalysis.mutate({
      periodA: dateRange,
      periodB,
    })
  }

  // Determine which data to use based on compare mode
  const compareMode = comparisonConfig.enabled

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-gray-600">
            Deep dive into advertising performance and sales metrics
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {selectedClient && (
            <>
              <button
                onClick={() => setShowBrandSettings(!showBrandSettings)}
                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Brand Keywords
              </button>
              <button
                onClick={handleGetAiInsights}
                disabled={aiAnalysis.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {aiAnalysis.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Get AI Insights
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date Filter */}
      {selectedClient && (
        <div className="mt-4">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            comparisonConfig={comparisonConfig}
            onComparisonChange={setComparisonConfig}
          />
        </div>
      )}

      {/* Brand Keywords Settings Panel */}
      {showBrandSettings && selectedClient && (
        <div className="mt-4 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Brand Keywords
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Add keywords that identify your brand. Keywords containing these terms will be classified as "branded" in the charts.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newBrandKeyword}
              onChange={(e) => setNewBrandKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBrandKeyword()}
              placeholder="Enter brand term..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={handleAddBrandKeyword}
              disabled={!newBrandKeyword.trim() || addBrandKeyword.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {brandKeywords.data?.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeBrandKeyword.mutate(keyword)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  x
                </button>
              </span>
            ))}
            {brandKeywords.data?.length === 0 && (
              <span className="text-sm text-gray-500">No brand keywords configured</span>
            )}
          </div>
        </div>
      )}

      {/* No Client Selected State */}
      {!selectedClient ? (
        <div className="mt-8 bg-white shadow rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Select a client to view analytics
          </h3>
          <p className="mt-2 text-gray-500">
            Choose a client from the dropdown above to see their advertising and sales analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SalesBreakdownChart
              data={compareMode ? salesBreakdownComparison.periodA : (salesBreakdown.data || [])}
              isLoading={compareMode ? salesBreakdownComparison.isLoading : salesBreakdown.isLoading}
              comparisonData={compareMode ? salesBreakdownComparison.periodB : undefined}
              compareMode={compareMode}
            />
            <TacosChart
              data={compareMode ? tacosTrendComparison.periodA : (tacosTrend.data || [])}
              isLoading={compareMode ? tacosTrendComparison.isLoading : tacosTrend.isLoading}
              comparisonData={compareMode ? tacosTrendComparison.periodB : undefined}
              compareMode={compareMode}
            />
          </div>

          {/* Charts Row 2 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SessionsRevenueChart
              data={compareMode ? sessionsRevenueComparison.periodA : (sessionsRevenue.data || [])}
              isLoading={compareMode ? sessionsRevenueComparison.isLoading : sessionsRevenue.isLoading}
              comparisonData={compareMode ? sessionsRevenueComparison.periodB : undefined}
              compareMode={compareMode}
            />
            <KeywordBubbleChart
              data={keywordPerformance.data || []}
              isLoading={keywordPerformance.isLoading}
            />
          </div>

          {/* Charts Row 3 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BrandedSpendChart
              data={compareMode ? brandedSpendComparison.periodA : (brandedSpend.data || [])}
              isLoading={compareMode ? brandedSpendComparison.isLoading : brandedSpend.isLoading}
              comparisonData={compareMode ? brandedSpendComparison.periodB : undefined}
              compareMode={compareMode}
            />
            <BsrSpendChart
              data={bsrVsSpend.data || []}
              isLoading={bsrVsSpend.isLoading}
            />
          </div>

          {/* Charts Row 4 - Full Width */}
          <div className="mt-6">
            <SkuTacosGrid
              data={topSkuTacos.data || []}
              isLoading={topSkuTacos.isLoading}
            />
          </div>

          {/* Charts Row 5 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GrowthWaterfallChart
              data={growthDecomposition.data}
              isLoading={growthDecomposition.isLoading}
            />
            <WastedSpendChart
              data={compareMode ? wastedSpendComparison.periodA : wastedSpend.data}
              isLoading={compareMode ? wastedSpendComparison.isLoading : wastedSpend.isLoading}
              comparisonData={compareMode ? wastedSpendComparison.periodB : undefined}
              compareMode={compareMode}
            />
          </div>
        </>
      )}

      {/* AI Analysis Panel */}
      <AiAnalysisPanel
        isOpen={showAiPanel}
        onClose={() => setShowAiPanel(false)}
        data={aiAnalysis.data || null}
        isLoading={aiAnalysis.isPending}
        error={aiAnalysis.error}
      />
    </div>
  )
}
