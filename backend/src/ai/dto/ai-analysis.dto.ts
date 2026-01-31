import { IsString, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class AiAnalysisRequestDto {
  @IsObject()
  @ValidateNested()
  @Type(() => DateRangeDto)
  periodA: DateRangeDto;

  @IsObject()
  @ValidateNested()
  @Type(() => DateRangeDto)
  periodB: DateRangeDto;
}

export interface AiInsight {
  category: 'tacos' | 'revenue' | 'spend' | 'efficiency' | 'opportunity';
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
  title: string;
  description: string;
  metric?: string;
  change?: number;
}

export interface AiRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  expectedImpact?: string;
}

export interface PeriodMetrics {
  totalRevenue: number;
  totalAdSpend: number;
  avgTacos: number;
  wastedSpend: number;
  organicSales: number;
  adAttributedSales: number;
  brandedSpend: number;
  nonBrandedSpend: number;
}

export interface AiAnalysisMetrics {
  periodA: PeriodMetrics;
  periodB: PeriodMetrics;
  changes: {
    revenue: number;
    adSpend: number;
    tacos: number;
    wastedSpend: number;
    organicSales: number;
    adAttributedSales: number;
  };
  topPerformingSkus: string[];
  underPerformingSkus: string[];
}

export interface AiAnalysisResponse {
  summary: string;
  insights: AiInsight[];
  recommendations: AiRecommendation[];
  metrics: AiAnalysisMetrics;
  generatedAt: string;
}
