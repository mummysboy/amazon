import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface Client {
  id: string
  name: string
}

interface DailySales {
  date: string
  ordered_product_sales: number
  units_ordered: number
  sessions: number
  page_views: number
  unit_session_percentage: number
}

interface SearchTerm {
  search_term: string
  search_query_volume: number
  impressions_total: number
  impressions_brand: number
  impressions_brand_share: number
  clicks_total: number
  clicks_brand: number
  clicks_brand_share: number
  purchases_total: number
  purchases_brand: number
  purchases_brand_share: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function DashboardPage() {
  const [selectedClient, setSelectedClient] = useState<string>('')

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/clients')
      return data
    },
  })

  const { data: dailySales = [] } = useQuery({
    queryKey: ['daily-sales', selectedClient],
    queryFn: async () => {
      const { data } = await api.get<DailySales[]>(`/api/reports/daily-sales/${selectedClient}`)
      return data
    },
    enabled: !!selectedClient,
  })

  const { data: searchTerms = [] } = useQuery({
    queryKey: ['search-terms', selectedClient],
    queryFn: async () => {
      const { data } = await api.get<SearchTerm[]>(`/api/reports/search-terms/${selectedClient}`)
      return data
    },
    enabled: !!selectedClient,
  })

  // Calculate KPIs
  const totalSales = dailySales.reduce((sum, d) => sum + Number(d.ordered_product_sales), 0)
  const totalUnits = dailySales.reduce((sum, d) => sum + d.units_ordered, 0)
  const totalSessions = dailySales.reduce((sum, d) => sum + d.sessions, 0)
  const conversionRate = totalSessions > 0 ? ((totalUnits / totalSessions) * 100) : 0

  // Brand Analytics metrics from search terms
  const totalImpressions = searchTerms.reduce((sum, s) => sum + (s.impressions_total || 0), 0)
  const brandImpressions = searchTerms.reduce((sum, s) => sum + (s.impressions_brand || 0), 0)
  const totalClicks = searchTerms.reduce((sum, s) => sum + (s.clicks_total || 0), 0)
  const brandClicks = searchTerms.reduce((sum, s) => sum + (s.clicks_brand || 0), 0)
  const totalPurchases = searchTerms.reduce((sum, s) => sum + (s.purchases_total || 0), 0)
  const brandPurchases = searchTerms.reduce((sum, s) => sum + (s.purchases_brand || 0), 0)

  const avgBrandShareImpressions = totalImpressions > 0 ? (brandImpressions / totalImpressions) * 100 : 0
  const avgBrandShareClicks = totalClicks > 0 ? (brandClicks / totalClicks) * 100 : 0
  const avgBrandSharePurchases = totalPurchases > 0 ? (brandPurchases / totalPurchases) * 100 : 0

  // Prepare chart data
  const salesChartData = dailySales.slice(-30).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: Number(d.ordered_product_sales),
    units: d.units_ordered,
    sessions: d.sessions,
  }))

  const topSearchTerms = [...searchTerms]
    .sort((a, b) => (b.search_query_volume || 0) - (a.search_query_volume || 0))
    .slice(0, 10)
    .map(s => ({
      term: s.search_term?.length > 20 ? s.search_term.substring(0, 20) + '...' : s.search_term,
      volume: s.search_query_volume || 0,
      brandShare: s.impressions_brand_share || 0,
    }))

  const brandShareData = [
    { name: 'Impressions', brand: avgBrandShareImpressions, other: 100 - avgBrandShareImpressions },
    { name: 'Clicks', brand: avgBrandShareClicks, other: 100 - avgBrandShareClicks },
    { name: 'Purchases', brand: avgBrandSharePurchases, other: 100 - avgBrandSharePurchases },
  ]

  const funnelData = [
    { stage: 'Impressions', total: totalImpressions, brand: brandImpressions },
    { stage: 'Clicks', total: totalClicks, brand: brandClicks },
    { stage: 'Purchases', total: totalPurchases, brand: brandPurchases },
  ]

  const pieData = [
    { name: 'Brand', value: brandImpressions },
    { name: 'Competitors', value: totalImpressions - brandImpressions },
  ]

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">Track your brand performance and market share</p>
        </div>
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
      </div>

      {!selectedClient ? (
        <div className="mt-8 bg-white shadow rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">Select a client to view analytics</h3>
          <p className="mt-2 text-gray-500">
            Choose a client from the dropdown above to see their Brand Analytics data.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalSales.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{dailySales.length} days</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Units Sold</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Conversion: {conversionRate.toFixed(2)}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Brand Share (Impressions)</p>
              <p className="text-2xl font-bold text-blue-600">{avgBrandShareImpressions.toFixed(2)}%</p>
              <p className="text-xs text-gray-400 mt-1">{brandImpressions.toLocaleString()} / {totalImpressions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Brand Share (Purchases)</p>
              <p className="text-2xl font-bold text-green-600">{avgBrandSharePurchases.toFixed(2)}%</p>
              <p className="text-xs text-gray-400 mt-1">{brandPurchases.toLocaleString()} / {totalPurchases.toLocaleString()}</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sales Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
              {salesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']} />
                    <Area type="monotone" dataKey="sales" stroke="#3B82F6" fill="#93C5FD" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No sales data available</p>
              )}
            </div>

            {/* Brand Share of Voice */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Share of Voice</h3>
              {pieData[0].value > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No search term data available</p>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Brand Share Comparison */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Share by Funnel Stage</h3>
              {searchTerms.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={brandShareData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="brand" name="Brand %" fill="#3B82F6" stackId="a" />
                    <Bar dataKey="other" name="Competitors %" fill="#E5E7EB" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel (Brand)</h3>
              {funnelData[0].brand > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Legend />
                    <Bar dataKey="brand" name="Brand" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          </div>

          {/* Top Search Terms */}
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Search Terms by Volume</h3>
            {topSearchTerms.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topSearchTerms} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="term" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" name="Search Volume" fill="#3B82F6" />
                  <Bar dataKey="brandShare" name="Brand Share %" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No search term data. Upload a Search Query Performance report.</p>
            )}
          </div>

          {/* Sessions & Units Trend */}
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions & Units Trend</h3>
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="sessions" name="Sessions" stroke="#8B5CF6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="units" name="Units Sold" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
