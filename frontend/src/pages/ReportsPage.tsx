import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

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
  buy_box_percentage: number
  unit_session_percentage: number
}

interface ProductPerformance {
  child_asin: string
  title: string
  sessions: number
  page_views: number
  units_ordered: number
  ordered_product_sales: number
  unit_session_percentage: number
}

interface SearchTerm {
  search_term: string
  search_query_volume: number
  impressions_total: number
  clicks_total: number
  purchases_total: number
  impressions_brand_share: number
}

export function ReportsPage() {
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'search'>('sales')

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/clients')
      return data
    },
  })

  const { data: dailySales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['daily-sales', selectedClient],
    queryFn: async () => {
      const { data } = await api.get<DailySales[]>(`/api/reports/daily-sales/${selectedClient}`)
      return data
    },
    enabled: !!selectedClient,
  })

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', selectedClient],
    queryFn: async () => {
      const { data } = await api.get<ProductPerformance[]>(`/api/reports/products/${selectedClient}`)
      return data
    },
    enabled: !!selectedClient,
  })

  const { data: searchTerms = [], isLoading: loadingSearch } = useQuery({
    queryKey: ['search-terms', selectedClient],
    queryFn: async () => {
      const { data } = await api.get<SearchTerm[]>(`/api/reports/search-terms/${selectedClient}`)
      return data
    },
    enabled: !!selectedClient,
  })

  // Calculate summary stats
  const totalSales = dailySales.reduce((sum, d) => sum + Number(d.ordered_product_sales), 0)
  const totalUnits = dailySales.reduce((sum, d) => sum + d.units_ordered, 0)
  const totalSessions = dailySales.reduce((sum, d) => sum + d.sessions, 0)
  const avgConversion = totalSessions > 0 ? ((totalUnits / totalSessions) * 100).toFixed(2) : '0'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <p className="mt-2 text-gray-600">View uploaded Amazon data</p>

      {/* Client Selection */}
      <div className="mt-6 max-w-xs">
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a client...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {selectedClient && (
        <>
          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">${totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Units Sold</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{totalSessions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{avgConversion}%</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'sales', name: 'Daily Sales' },
                { id: 'products', name: 'Products' },
                { id: 'search', name: 'Search Terms' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Daily Sales Tab */}
          {activeTab === 'sales' && (
            <div className="mt-6">
              {loadingSales ? (
                <p className="text-gray-500">Loading...</p>
              ) : dailySales.length === 0 ? (
                <p className="text-gray-500">No daily sales data. Upload "Detail Page Sales and Traffic.csv"</p>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dailySales.slice(0, 30).map((row) => (
                        <tr key={row.date}>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${Number(row.ordered_product_sales).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.units_ordered}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.sessions}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.unit_session_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="mt-6">
              {loadingProducts ? (
                <p className="text-gray-500">Loading...</p>
              ) : products.length === 0 ? (
                <p className="text-gray-500">No product data. Upload "Detail Page Sales and Traffic By Child Item.csv"</p>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ASIN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((row) => (
                        <tr key={row.child_asin}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{row.child_asin}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{row.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${Number(row.ordered_product_sales).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.units_ordered}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.unit_session_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Search Terms Tab */}
          {activeTab === 'search' && (
            <div className="mt-6">
              {loadingSearch ? (
                <p className="text-gray-500">Loading...</p>
              ) : searchTerms.length === 0 ? (
                <p className="text-gray-500">No search term data. Upload "US_Search_Query_Performance*.csv"</p>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Search Term</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchases</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brand Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {searchTerms.slice(0, 50).map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.search_term}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.search_query_volume?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.impressions_total?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.clicks_total?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.purchases_total}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.impressions_brand_share?.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
