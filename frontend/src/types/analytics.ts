export interface DateRange {
  startDate: string
  endDate: string
}

export interface GrowthPeriod {
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
}

export interface SalesBreakdownPoint {
  date: string
  totalSales: number
  adSpend: number
  adAttributedSales: number
  organicSales: number
}

export interface TacosPoint {
  date: string
  tacos: number
  totalSales: number
  adSpend: number
}

export interface SessionsRevenuePoint {
  date: string
  sessions: number
  pageViews: number
  revenue: number
  conversionRate: number
}

export interface KeywordBubblePoint {
  keywordText: string
  spend: number
  orders: number
  impressions: number
  clicks: number
  isBranded: boolean
  acos: number
  ctr: number
}

export interface BrandedSpendPoint {
  date: string
  brandedSpend: number
  nonBrandedSpend: number
  brandedSales: number
  nonBrandedSales: number
}

export interface BsrSpendPoint {
  asin: string
  sku: string
  categoryRank: number
  categoryName: string
  adSpend: number
  adSales: number
  productName?: string
}

export interface SkuTacosData {
  sku: string
  asin: string
  productName?: string
  totalSales: number
  adSpend: number
  tacos: number
  dataPoints: {
    date: string
    tacos: number
  }[]
}

export interface GrowthDecomposition {
  baselineRevenue: number
  trafficContribution: number
  conversionContribution: number
  adContribution: number
  organicContribution: number
  finalRevenue: number
  percentChange: number
}

export interface WastedSpendPoint {
  date: string
  totalWastedSpend: number
  keywordCount: number
  topWastedKeywords: {
    keywordText: string
    spend: number
    clicks: number
  }[]
}

export interface WastedKeyword {
  keywordText: string
  totalSpend: number
  totalClicks: number
  dates: string[]
}

export interface WastedSpendData {
  daily: WastedSpendPoint[]
  keywords: WastedKeyword[]
}

export type DatePreset = '7d' | '14d' | '30d' | '90d' | 'custom'

// Comparison types
export interface ComparisonDateRange {
  periodA: DateRange
  periodB: DateRange
}

export interface ComparisonConfig {
  enabled: boolean
  periodB?: DateRange
}

// Comparison-aware data structures for charts
export interface ComparisonDataPoint<T> {
  periodA: T[]
  periodB: T[]
}

export interface NormalizedComparisonPoint {
  dayIndex: number
  dayLabel: string
}
