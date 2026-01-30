import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Client {
  id: string
  name: string
}

interface UploadSession {
  id: string
  clientId: string
  clientName?: string
  reportType: string
  fileName?: string
  status: string
  recordsInserted: number
  createdAt: string
  completedAt?: string
}

type ReportType =
  | 'daily_sales'
  | 'product_performance'
  | 'parent_performance'
  | 'search_terms'
  | 'inventory'
  | 'advertising_report'
  | 'advertising_bulk'
  | 'sku_campaign_mapping'
  | 'parent_child'
  | 'restocking_limits'
  | 'idq_scores'
  | 'sku_rankings'

const reportTypes: { value: ReportType; label: string; description: string; fileHint: string }[] = [
  {
    value: 'daily_sales',
    label: 'Daily Sales & Traffic',
    description: 'Daily aggregate sales, sessions, page views',
    fileHint: 'Detail Page Sales and Traffic.csv',
  },
  {
    value: 'product_performance',
    label: 'Product Performance (Child)',
    description: 'Child ASIN-level sales and conversion data',
    fileHint: 'Detail Page Sales and Traffic By Child Item.csv',
  },
  {
    value: 'parent_performance',
    label: 'Product Performance (Parent)',
    description: 'Parent ASIN-level sales and conversion data',
    fileHint: 'Detail Page Sales and Traffic By Parent Item.csv',
  },
  {
    value: 'search_terms',
    label: 'Search Query Performance',
    description: 'Search term impressions, clicks, purchases',
    fileHint: 'US_Search_Query_Performance*.csv',
  },
  {
    value: 'inventory',
    label: 'Inventory',
    description: 'Current FBA inventory levels',
    fileHint: 'Amazon-fulfilled+Inventory*.txt',
  },
  {
    value: 'advertising_report',
    label: 'Advertising Reports (CSV)',
    description: 'Campaign, ad group, and keyword performance metrics',
    fileHint: 'Sponsored Products/Brands/Display CSV reports',
  },
  {
    value: 'advertising_bulk',
    label: 'Advertising Bulk File (Excel)',
    description: 'Amazon Advertising bulk operations Excel file with all campaign types',
    fileHint: 'bulk-*.xlsx from Amazon Advertising console',
  },
  {
    value: 'sku_campaign_mapping',
    label: 'SKU Campaign Mapping',
    description: 'Map SKUs to advertising campaigns',
    fileHint: 'Custom mapping file with SKU, Campaign ID columns',
  },
  {
    value: 'parent_child',
    label: 'Parent-Child Mapping',
    description: 'ASIN variation relationships',
    fileHint: 'Catalog export or custom mapping file',
  },
  {
    value: 'restocking_limits',
    label: 'Restocking Limits',
    description: 'FBA storage limits and utilization',
    fileHint: 'FBA Inventory Age/Restocking report',
  },
  {
    value: 'idq_scores',
    label: 'IDQ Scores',
    description: 'Inventory quality and stranded/excess inventory',
    fileHint: 'FBA Inventory Health or custom export',
  },
  {
    value: 'sku_rankings',
    label: 'SKU Rankings',
    description: 'BSR, pricing, and Keepa data',
    fileHint: 'Keepa export or custom rankings file',
  },
]

interface UploadResult {
  success: boolean
  reportType: string
  inserted: number
  updated?: number
  skipped?: number
  errors?: number
  sessionId?: string
}

export function UploadPage() {
  const queryClient = useQueryClient()
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('daily_sales')
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/clients')
      return data
    },
  })

  const { data: uploadHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['upload-history', selectedClient],
    queryFn: async () => {
      const params = selectedClient ? `?clientId=${selectedClient}` : ''
      const { data } = await api.get<{ sessions: UploadSession[]; total: number }>(
        `/api/uploads/history${params}`
      )
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.delete(`/api/uploads/${sessionId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
      // Invalidate all data queries so graphs/dashboards refresh
      queryClient.invalidateQueries({ queryKey: ['daily-sales'] })
      queryClient.invalidateQueries({ queryKey: ['search-terms'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['advertising'] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({
      clientId,
      reportType,
      content,
      fileName,
    }: {
      clientId: string
      reportType: ReportType
      content: string
      fileName?: string
    }) => {
      const { data } = await api.post<UploadResult>('/api/uploads', {
        clientId,
        reportType,
        content,
        fileName,
      })
      return data
    },
    onSuccess: (data) => {
      let message = `Uploaded ${data.inserted} records`
      if (data.updated && data.updated > 0) {
        message += `, updated ${data.updated}`
      }
      if (data.skipped && data.skipped > 0) {
        message += `, skipped ${data.skipped}`
      }
      if (data.errors && data.errors > 0) {
        message += ` (${data.errors} parse errors)`
      }
      setUploadResult({ success: true, message })
      setFile(null)
      // Invalidate upload history
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
      // Invalidate all data queries so graphs/dashboards refresh with new data
      queryClient.invalidateQueries({ queryKey: ['daily-sales'] })
      queryClient.invalidateQueries({ queryKey: ['search-terms'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['advertising'] })
    },
    onError: (error: Error) => {
      setUploadResult({ success: false, message: error.message })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedClient) return

    let content: string

    // Check if it's an Excel file
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Convert to base64 for Excel files using FileReader for reliable encoding
      content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          console.log('Base64 conversion complete, length:', result.length)
          console.log('Starts with:', result.substring(0, 50))
          resolve(result)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
    } else {
      content = await file.text()
    }

    uploadMutation.mutate({
      clientId: selectedClient,
      reportType: selectedReportType,
      content,
      fileName: file.name,
    })
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this upload? This will remove all associated data.')) {
      return
    }
    setDeletingId(sessionId)
    try {
      await deleteMutation.mutateAsync(sessionId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getReportTypeLabel = (type: string) => {
    const found = reportTypes.find((r) => r.value === type)
    return found?.label || type
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
      <p className="mt-2 text-gray-600">Import Amazon reports for your clients</p>

      <div className="mt-8 max-w-2xl">
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {reportTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedReportType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={selectedReportType === type.value}
                    onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">{type.label}</span>
                    <p className="text-sm text-gray-500">{type.description}</p>
                    <p className="text-xs text-gray-400 mt-1">File: {type.fileHint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV or TXT files</p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`p-4 rounded-md ${
                uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {uploadResult.message}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !selectedClient || uploadMutation.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Data'}
          </button>
        </div>
      </div>

      {/* Upload History */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upload History</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : !uploadHistory?.sessions.length ? (
            <div className="p-8 text-center text-gray-500">No uploads yet</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadHistory.sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(session.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {session.clientName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getReportTypeLabel(session.reportType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                      {session.fileName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : session.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.recordsInserted.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === session.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
