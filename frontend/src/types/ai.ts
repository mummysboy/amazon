export interface AiInsight {
  category: 'tacos' | 'revenue' | 'spend' | 'efficiency' | 'opportunity'
  severity: 'positive' | 'neutral' | 'warning' | 'critical'
  title: string
  description: string
  metric?: string
  change?: number
}

export interface AiRecommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  rationale: string
  expectedImpact?: string
}

export interface PeriodMetrics {
  totalRevenue: number
  totalAdSpend: number
  avgTacos: number
  wastedSpend: number
  organicSales: number
  adAttributedSales: number
  brandedSpend: number
  nonBrandedSpend: number
}

export interface AiAnalysisResponse {
  summary: string
  insights: AiInsight[]
  recommendations: AiRecommendation[]
  metrics: {
    periodA: PeriodMetrics
    periodB: PeriodMetrics
    changes: {
      revenue: number
      adSpend: number
      tacos: number
      wastedSpend: number
      organicSales: number
      adAttributedSales: number
    }
    topPerformingSkus: string[]
    underPerformingSkus: string[]
  }
  generatedAt: string
}

export interface AiAnalysisRequest {
  periodA: {
    startDate: string
    endDate: string
  }
  periodB: {
    startDate: string
    endDate: string
  }
}
