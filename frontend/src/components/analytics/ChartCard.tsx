interface ChartCardProps {
  title: string
  children: React.ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  className?: string
}

export function ChartCard({
  title,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  className = '',
}: ChartCardProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
