import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type {
  DateRange,
  GrowthPeriod,
  SalesBreakdownPoint,
  TacosPoint,
  SessionsRevenuePoint,
  KeywordBubblePoint,
  BrandedSpendPoint,
  BsrSpendPoint,
  SkuTacosData,
  GrowthDecomposition,
  WastedSpendData,
} from '../types/analytics'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function useSalesBreakdown(clientId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'sales-breakdown', clientId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<SalesBreakdownPoint[]>(
        `/api/analytics/${clientId}/sales-breakdown`,
        { params: dateRange }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useTacosTrend(clientId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'tacos-trend', clientId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<TacosPoint[]>(
        `/api/analytics/${clientId}/tacos-trend`,
        { params: dateRange }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useSessionsRevenue(clientId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'sessions-revenue', clientId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<SessionsRevenuePoint[]>(
        `/api/analytics/${clientId}/sessions-revenue`,
        { params: dateRange }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useKeywordPerformance(clientId: string, dateRange: DateRange, limit = 100) {
  return useQuery({
    queryKey: ['analytics', 'keyword-performance', clientId, dateRange, limit],
    queryFn: async () => {
      const { data } = await api.get<KeywordBubblePoint[]>(
        `/api/analytics/${clientId}/keyword-performance`,
        { params: { ...dateRange, limit } }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useBrandedSpend(clientId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'branded-spend', clientId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<BrandedSpendPoint[]>(
        `/api/analytics/${clientId}/branded-spend`,
        { params: dateRange }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useBsrVsSpend(clientId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'bsr-vs-spend', clientId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<BsrSpendPoint[]>(
        `/api/analytics/${clientId}/bsr-vs-spend`,
        { params: dateRange }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useTopSkuTacos(clientId: string, dateRange: DateRange, limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-sku-tacos', clientId, dateRange, limit],
    queryFn: async () => {
      const { data } = await api.get<SkuTacosData[]>(
        `/api/analytics/${clientId}/top-sku-tacos`,
        { params: { ...dateRange, limit } }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useGrowthDecomposition(clientId: string, period: GrowthPeriod) {
  return useQuery({
    queryKey: ['analytics', 'growth-decomposition', clientId, period],
    queryFn: async () => {
      const { data } = await api.get<GrowthDecomposition>(
        `/api/analytics/${clientId}/growth-decomposition`,
        { params: period }
      )
      return data
    },
    enabled: !!clientId && !!period.currentStart && !!period.currentEnd && !!period.previousStart && !!period.previousEnd,
    staleTime: STALE_TIME,
  })
}

export function useWastedSpend(clientId: string, dateRange: DateRange, clickThreshold = 1) {
  return useQuery({
    queryKey: ['analytics', 'wasted-spend', clientId, dateRange, clickThreshold],
    queryFn: async () => {
      const { data } = await api.get<WastedSpendData>(
        `/api/analytics/${clientId}/wasted-spend`,
        { params: { ...dateRange, clickThreshold } }
      )
      return data
    },
    enabled: !!clientId && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: STALE_TIME,
  })
}

export function useBrandKeywords(clientId: string) {
  return useQuery({
    queryKey: ['analytics', 'brand-keywords', clientId],
    queryFn: async () => {
      const { data } = await api.get<string[]>(`/api/analytics/${clientId}/brand-keywords`)
      return data
    },
    enabled: !!clientId,
    staleTime: STALE_TIME,
  })
}

export function useAddBrandKeyword(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyword: string) => {
      await api.post(`/api/analytics/${clientId}/brand-keywords`, { keyword })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'brand-keywords', clientId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', 'keyword-performance', clientId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', 'branded-spend', clientId] })
    },
  })
}

export function useRemoveBrandKeyword(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyword: string) => {
      await api.delete(`/api/analytics/${clientId}/brand-keywords/${encodeURIComponent(keyword)}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'brand-keywords', clientId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', 'keyword-performance', clientId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', 'branded-spend', clientId] })
    },
  })
}

// Utility function to get date range from preset
export function getDateRangeFromPreset(preset: '7d' | '14d' | '30d' | '90d'): DateRange {
  const endDate = new Date()
  const startDate = new Date()

  switch (preset) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '14d':
      startDate.setDate(endDate.getDate() - 14)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

// Utility function to get growth comparison periods
export function getGrowthPeriods(dateRange: DateRange): GrowthPeriod {
  const currentStart = new Date(dateRange.startDate)
  const currentEnd = new Date(dateRange.endDate)
  const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))

  const previousEnd = new Date(currentStart)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - daysDiff)

  return {
    currentStart: dateRange.startDate,
    currentEnd: dateRange.endDate,
    previousStart: previousStart.toISOString().split('T')[0],
    previousEnd: previousEnd.toISOString().split('T')[0],
  }
}
