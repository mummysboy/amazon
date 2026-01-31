import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  AiAnalysisResponse,
  AiInsight,
  AiRecommendation,
  AiAnalysisMetrics,
  PeriodMetrics,
} from './dto/ai-analysis.dto';

interface DateRange {
  startDate: string;
  endDate: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(
    private configService: ConfigService,
    private analyticsService: AnalyticsService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async analyzePerformance(
    clientId: string,
    periodA: DateRange,
    periodB: DateRange,
  ): Promise<AiAnalysisResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Gather metrics for both periods in parallel
    const [metricsA, metricsB, topSkuTacos] = await Promise.all([
      this.getPeriodMetrics(clientId, periodA.startDate, periodA.endDate),
      this.getPeriodMetrics(clientId, periodB.startDate, periodB.endDate),
      this.analyticsService.getTopSkuTacos(clientId, periodA.startDate, periodA.endDate, 10),
    ]);

    // Calculate changes between periods
    const changes = this.calculateChanges(metricsA, metricsB);

    // Identify top/bottom SKUs
    const sortedSkus = [...topSkuTacos].sort((a, b) => a.tacos - b.tacos);
    const topPerformingSkus = sortedSkus.slice(0, 3).map((s) => s.sku || s.asin);
    const underPerformingSkus = sortedSkus.slice(-3).reverse().map((s) => s.sku || s.asin);

    const metrics: AiAnalysisMetrics = {
      periodA: metricsA,
      periodB: metricsB,
      changes,
      topPerformingSkus,
      underPerformingSkus,
    };

    // Build prompt with ONLY summary metrics
    const prompt = this.buildPrompt(metrics, periodA, periodB);

    // Call OpenAI API
    const response = await this.callOpenAI(prompt);

    return {
      ...response,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getPeriodMetrics(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<PeriodMetrics> {
    const [salesBreakdown, tacosTrend, wastedSpendData, brandedSpend] = await Promise.all([
      this.analyticsService.getSalesBreakdown(clientId, startDate, endDate),
      this.analyticsService.getTacosTrend(clientId, startDate, endDate),
      this.analyticsService.getWastedSpend(clientId, startDate, endDate),
      this.analyticsService.getBrandedSpend(clientId, startDate, endDate),
    ]);

    const totalRevenue = salesBreakdown.reduce((sum, d) => sum + d.totalSales, 0);
    const totalAdSpend = salesBreakdown.reduce((sum, d) => sum + d.adSpend, 0);
    const organicSales = salesBreakdown.reduce((sum, d) => sum + d.organicSales, 0);
    const adAttributedSales = salesBreakdown.reduce((sum, d) => sum + d.adAttributedSales, 0);
    const avgTacos = tacosTrend.length > 0
      ? tacosTrend.reduce((sum, d) => sum + d.tacos, 0) / tacosTrend.length
      : 0;
    const wastedSpend = wastedSpendData.daily.reduce(
      (sum: number, d: any) => sum + d.totalWastedSpend,
      0,
    );
    const brandedSpendTotal = brandedSpend.reduce((sum, d) => sum + d.brandedSpend, 0);
    const nonBrandedSpend = brandedSpend.reduce((sum, d) => sum + d.nonBrandedSpend, 0);

    return {
      totalRevenue,
      totalAdSpend,
      avgTacos,
      wastedSpend,
      organicSales,
      adAttributedSales,
      brandedSpend: brandedSpendTotal,
      nonBrandedSpend,
    };
  }

  private calculateChanges(
    metricsA: PeriodMetrics,
    metricsB: PeriodMetrics,
  ): AiAnalysisMetrics['changes'] {
    const pctChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      revenue: pctChange(metricsA.totalRevenue, metricsB.totalRevenue),
      adSpend: pctChange(metricsA.totalAdSpend, metricsB.totalAdSpend),
      tacos: pctChange(metricsA.avgTacos, metricsB.avgTacos),
      wastedSpend: pctChange(metricsA.wastedSpend, metricsB.wastedSpend),
      organicSales: pctChange(metricsA.organicSales, metricsB.organicSales),
      adAttributedSales: pctChange(metricsA.adAttributedSales, metricsB.adAttributedSales),
    };
  }

  private buildPrompt(
    metrics: AiAnalysisMetrics,
    periodA: DateRange,
    periodB: DateRange,
  ): string {
    const { periodA: a, periodB: b, changes } = metrics;
    const brandedPctA = a.brandedSpend + a.nonBrandedSpend > 0
      ? (a.brandedSpend / (a.brandedSpend + a.nonBrandedSpend)) * 100
      : 0;
    const brandedPctB = b.brandedSpend + b.nonBrandedSpend > 0
      ? (b.brandedSpend / (b.brandedSpend + b.nonBrandedSpend)) * 100
      : 0;

    return `You are an expert Amazon advertising analyst. Compare the following two periods and provide actionable insights.

PERIOD A (Current): ${periodA.startDate} to ${periodA.endDate}
PERIOD B (Previous): ${periodB.startDate} to ${periodB.endDate}

=== SUMMARY METRICS ===

| Metric | Period A | Period B | Change |
|--------|----------|----------|--------|
| Total Revenue | $${a.totalRevenue.toLocaleString()} | $${b.totalRevenue.toLocaleString()} | ${changes.revenue >= 0 ? '+' : ''}${changes.revenue.toFixed(1)}% |
| Total Ad Spend | $${a.totalAdSpend.toLocaleString()} | $${b.totalAdSpend.toLocaleString()} | ${changes.adSpend >= 0 ? '+' : ''}${changes.adSpend.toFixed(1)}% |
| Average TACOS | ${a.avgTacos.toFixed(2)}% | ${b.avgTacos.toFixed(2)}% | ${changes.tacos >= 0 ? '+' : ''}${changes.tacos.toFixed(1)}% |
| Wasted Spend | $${a.wastedSpend.toLocaleString()} | $${b.wastedSpend.toLocaleString()} | ${changes.wastedSpend >= 0 ? '+' : ''}${changes.wastedSpend.toFixed(1)}% |
| Organic Sales | $${a.organicSales.toLocaleString()} | $${b.organicSales.toLocaleString()} | ${changes.organicSales >= 0 ? '+' : ''}${changes.organicSales.toFixed(1)}% |
| Ad-Attributed Sales | $${a.adAttributedSales.toLocaleString()} | $${b.adAttributedSales.toLocaleString()} | ${changes.adAttributedSales >= 0 ? '+' : ''}${changes.adAttributedSales.toFixed(1)}% |
| Branded Spend % | ${brandedPctA.toFixed(1)}% | ${brandedPctB.toFixed(1)}% | - |

TOP PERFORMING SKUs (lowest TACOS in Period A):
${metrics.topPerformingSkus.map((sku) => `- ${sku}`).join('\n')}

UNDERPERFORMING SKUs (highest TACOS in Period A):
${metrics.underPerformingSkus.map((sku) => `- ${sku}`).join('\n')}

Please provide your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence executive summary comparing the two periods",
  "insights": [
    {
      "category": "tacos|revenue|spend|efficiency|opportunity",
      "severity": "positive|neutral|warning|critical",
      "title": "Short insight title",
      "description": "Detailed explanation comparing both periods",
      "change": percentage_change_number_or_null
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Specific action to take",
      "rationale": "Why this action matters based on the comparison",
      "expectedImpact": "Expected outcome"
    }
  ]
}

Focus on:
1. What improved or declined between periods
2. TACOS efficiency changes
3. Revenue growth drivers (organic vs ad-attributed)
4. Wasted spend trends
5. Branded vs non-branded spend shifts
6. Actionable recommendations based on the comparison

Provide 4-6 insights and 3-5 recommendations prioritized by impact.`;
  }

  private async callOpenAI(prompt: string): Promise<{
    summary: string;
    insights: AiInsight[];
    recommendations: AiRecommendation[];
  }> {
    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert Amazon advertising analyst. Always respond with valid JSON only, no additional text or markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';

      // Parse the JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || 'Unable to generate summary',
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);

      // Return a fallback response
      return {
        summary:
          'Unable to generate AI analysis. Please check your OpenAI API configuration.',
        insights: [
          {
            category: 'efficiency',
            severity: 'neutral',
            title: 'Analysis Unavailable',
            description:
              'The AI analysis service encountered an error. Please try again later.',
          },
        ],
        recommendations: [
          {
            priority: 'high',
            action: 'Verify OpenAI API configuration',
            rationale: 'The AI service could not complete the analysis',
            expectedImpact: 'Enable AI-powered insights',
          },
        ],
      };
    }
  }
}
