import { useState } from 'react'
import type { DateRange, DatePreset, ComparisonConfig } from '../../types/analytics'
import { getDateRangeFromPreset } from '../../hooks/useAnalytics'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  comparisonConfig?: ComparisonConfig
  onComparisonChange?: (config: ComparisonConfig) => void
}

const presets: { label: string; value: DatePreset }[] = [
  { label: '7d', value: '7d' },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'Custom', value: 'custom' },
]

function calculatePreviousPeriod(dateRange: DateRange): DateRange {
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
}

export function DateRangeFilter({
  value,
  onChange,
  comparisonConfig,
  onComparisonChange,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>('30d')
  const [showCustom, setShowCustom] = useState(false)

  const handlePresetChange = (preset: DatePreset) => {
    setActivePreset(preset)
    if (preset === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      onChange(getDateRangeFromPreset(preset))
    }
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', date: string) => {
    onChange({
      ...value,
      [field]: date,
    })
  }

  const handleCompareToggle = () => {
    if (!onComparisonChange) return

    if (comparisonConfig?.enabled) {
      onComparisonChange({ enabled: false })
    } else {
      onComparisonChange({
        enabled: true,
        periodB: calculatePreviousPeriod(value),
      })
    }
  }

  const handlePeriodBChange = (field: 'startDate' | 'endDate', date: string) => {
    if (!onComparisonChange || !comparisonConfig?.periodB) return

    onComparisonChange({
      ...comparisonConfig,
      periodB: {
        ...comparisonConfig.periodB,
        [field]: date,
      },
    })
  }

  const handleMatchPreviousPeriod = () => {
    if (!onComparisonChange) return

    onComparisonChange({
      enabled: true,
      periodB: calculatePreviousPeriod(value),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetChange(preset.value)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activePreset === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={value.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}

        {onComparisonChange && (
          <>
            <div className="h-8 w-px bg-gray-300" />
            <button
              onClick={handleCompareToggle}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                comparisonConfig?.enabled
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Compare
            </button>
          </>
        )}
      </div>

      {comparisonConfig?.enabled && comparisonConfig.periodB && (
        <div className="flex items-center gap-4 pl-4 border-l-4 border-purple-200 bg-purple-50 py-2 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-purple-700">Period A:</span>
            <span className="text-sm text-purple-600">
              {new Date(value.startDate).toLocaleDateString()} - {new Date(value.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="h-4 w-px bg-purple-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-purple-700">Period B:</span>
            <input
              type="date"
              value={comparisonConfig.periodB.startDate}
              onChange={(e) => handlePeriodBChange('startDate', e.target.value)}
              className="px-2 py-1 border border-purple-300 rounded text-sm bg-white"
            />
            <span className="text-purple-500">to</span>
            <input
              type="date"
              value={comparisonConfig.periodB.endDate}
              onChange={(e) => handlePeriodBChange('endDate', e.target.value)}
              className="px-2 py-1 border border-purple-300 rounded text-sm bg-white"
            />
          </div>
          <button
            onClick={handleMatchPreviousPeriod}
            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 transition-colors"
          >
            Match Previous Period
          </button>
        </div>
      )}
    </div>
  )
}
