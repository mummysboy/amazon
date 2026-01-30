import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { DateRange } from '../types/analytics'
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
} from '../hooks/useAnalytics'

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

interface Client {
  id: string
  name: string
}

export function AnalyticsPage() {
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30d'))
  const [newBrandKeyword, setNewBrandKeyword] = useState('')
  const [showBrandSettings, setShowBrandSettings] = useState(false)

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

  // Analytics queries
  const salesBreakdown = useSalesBreakdown(selectedClient, dateRange)
  const tacosTrend = useTacosTrend(selectedClient, dateRange)
  const sessionsRevenue = useSessionsRevenue(selectedClient, dateRange)
  const keywordPerformance = useKeywordPerformance(selectedClient, dateRange)
  const brandedSpend = useBrandedSpend(selectedClient, dateRange)
  const bsrVsSpend = useBsrVsSpend(selectedClient, dateRange)
  const topSkuTacos = useTopSkuTacos(selectedClient, dateRange)
  const growthDecomposition = useGrowthDecomposition(selectedClient, growthPeriod)
  const wastedSpend = useWastedSpend(selectedClient, dateRange)

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
            <button
              onClick={() => setShowBrandSettings(!showBrandSettings)}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Brand Keywords
            </button>
          )}
        </div>
      </div>

      {/* Date Filter */}
      {selectedClient && (
        <div className="mt-4">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
              data={salesBreakdown.data || []}
              isLoading={salesBreakdown.isLoading}
            />
            <TacosChart
              data={tacosTrend.data || []}
              isLoading={tacosTrend.isLoading}
            />
          </div>

          {/* Charts Row 2 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SessionsRevenueChart
              data={sessionsRevenue.data || []}
              isLoading={sessionsRevenue.isLoading}
            />
            <KeywordBubbleChart
              data={keywordPerformance.data || []}
              isLoading={keywordPerformance.isLoading}
            />
          </div>

          {/* Charts Row 3 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BrandedSpendChart
              data={brandedSpend.data || []}
              isLoading={brandedSpend.isLoading}
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
              data={wastedSpend.data}
              isLoading={wastedSpend.isLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}
