import { useState } from 'react'
import type { DateRange, DatePreset } from '../../types/analytics'
import { getDateRangeFromPreset } from '../../hooks/useAnalytics'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const presets: { label: string; value: DatePreset }[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 14 days', value: '14d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
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

  return (
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
    </div>
  )
}
