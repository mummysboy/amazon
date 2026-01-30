import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SalesBreakdownPoint,
  TacosPoint,
  SessionsRevenuePoint,
  KeywordBubblePoint,
  BrandedSpendPoint,
  BsrSpendPoint,
  SkuTacosData,
  GrowthDecomposition,
  WastedSpendPoint,
  WastedKeyword,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }

  /**
   * Chart 1 & 2: Get sales breakdown data (Total Sales, Ad Spend, Ad Attributed, Organic)
   */
  async getSalesBreakdown(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<SalesBreakdownPoint[]> {
    // Get daily sales traffic data
    const { data: salesData, error: salesError } = await this.supabase
      .from('daily_sales_traffic')
      .select('date, ordered_product_sales')
      .eq('client_id', clientId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (salesError) throw salesError;

    // Get advertising metrics aggregated by date
    const { data: adData, error: adError } = await this.supabase
      .from('advertising_report_metrics')
      .select('report_date, spend, sales')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (adError) throw adError;

    // Aggregate ad metrics by date
    const adByDate = new Map<string, { spend: number; sales: number }>();
    for (const row of adData || []) {
      const existing = adByDate.get(row.report_date) || { spend: 0, sales: 0 };
      existing.spend += parseFloat(row.spend) || 0;
      existing.sales += parseFloat(row.sales) || 0;
      adByDate.set(row.report_date, existing);
    }

    // Combine data
    const result: SalesBreakdownPoint[] = (salesData || []).map((sale) => {
      const totalSales = parseFloat(sale.ordered_product_sales) || 0;
      const adMetrics = adByDate.get(sale.date) || { spend: 0, sales: 0 };
      const organicSales = Math.max(0, totalSales - adMetrics.sales);

      return {
        date: sale.date,
        totalSales,
        adSpend: adMetrics.spend,
        adAttributedSales: adMetrics.sales,
        organicSales,
      };
    });

    return result;
  }

  /**
   * Chart 2: Get TACOS (Total Advertising Cost of Sales) over time
   */
  async getTacosTrend(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<TacosPoint[]> {
    const breakdown = await this.getSalesBreakdown(clientId, startDate, endDate);

    return breakdown.map((point) => ({
      date: point.date,
      tacos: point.totalSales > 0 ? (point.adSpend / point.totalSales) * 100 : 0,
      totalSales: point.totalSales,
      adSpend: point.adSpend,
    }));
  }

  /**
   * Chart 3: Sessions vs Revenue (dual-axis)
   */
  async getSessionsRevenue(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<SessionsRevenuePoint[]> {
    const { data, error } = await this.supabase
      .from('daily_sales_traffic')
      .select('date, sessions, page_views, ordered_product_sales, total_order_items')
      .eq('client_id', clientId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => {
      const sessions = row.sessions || 0;
      const orderItems = row.total_order_items || 0;
      return {
        date: row.date,
        sessions,
        pageViews: row.page_views || 0,
        revenue: parseFloat(row.ordered_product_sales) || 0,
        conversionRate: sessions > 0 ? (orderItems / sessions) * 100 : 0,
      };
    });
  }

  /**
   * Chart 4: Keyword Performance Bubble Chart
   */
  async getKeywordPerformance(
    clientId: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
  ): Promise<KeywordBubblePoint[]> {
    // Get brand keywords for this client
    const { data: brandKeywords, error: brandError } = await this.supabase
      .from('brand_keywords')
      .select('keyword')
      .eq('client_id', clientId);

    if (brandError) throw brandError;

    const brandTerms = (brandKeywords || []).map((k) => k.keyword.toLowerCase());

    // Get keyword-level advertising metrics
    const { data: keywordData, error: keywordError } = await this.supabase
      .from('advertising_report_metrics')
      .select('keyword_text, spend, orders, impressions, clicks, sales')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .neq('keyword_id', '');

    if (keywordError) throw keywordError;

    // Aggregate by keyword
    const keywordMap = new Map<
      string,
      { spend: number; orders: number; impressions: number; clicks: number; sales: number }
    >();

    for (const row of keywordData || []) {
      if (!row.keyword_text) continue;
      const existing = keywordMap.get(row.keyword_text) || {
        spend: 0,
        orders: 0,
        impressions: 0,
        clicks: 0,
        sales: 0,
      };
      existing.spend += parseFloat(row.spend) || 0;
      existing.orders += row.orders || 0;
      existing.impressions += row.impressions || 0;
      existing.clicks += row.clicks || 0;
      existing.sales += parseFloat(row.sales) || 0;
      keywordMap.set(row.keyword_text, existing);
    }

    // Convert to array and calculate metrics
    const result: KeywordBubblePoint[] = Array.from(keywordMap.entries())
      .filter(([_, metrics]) => metrics.spend > 0)
      .map(([keywordText, metrics]) => {
        const isBranded = brandTerms.some((term) =>
          keywordText.toLowerCase().includes(term),
        );
        return {
          keywordText,
          spend: metrics.spend,
          orders: metrics.orders,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          isBranded,
          acos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : 0,
          ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
        };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, limit);

    return result;
  }

  /**
   * Chart 5: Branded vs Non-Branded Spend over time
   */
  async getBrandedSpend(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<BrandedSpendPoint[]> {
    // Get brand keywords for this client
    const { data: brandKeywords, error: brandError } = await this.supabase
      .from('brand_keywords')
      .select('keyword')
      .eq('client_id', clientId);

    if (brandError) throw brandError;

    const brandTerms = (brandKeywords || []).map((k) => k.keyword.toLowerCase());

    // Get keyword-level advertising metrics
    const { data: keywordData, error: keywordError } = await this.supabase
      .from('advertising_report_metrics')
      .select('report_date, keyword_text, spend, sales')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .neq('keyword_id', '');

    if (keywordError) throw keywordError;

    // Aggregate by date and branded/non-branded
    const dateMap = new Map<
      string,
      {
        brandedSpend: number;
        nonBrandedSpend: number;
        brandedSales: number;
        nonBrandedSales: number;
      }
    >();

    for (const row of keywordData || []) {
      const existing = dateMap.get(row.report_date) || {
        brandedSpend: 0,
        nonBrandedSpend: 0,
        brandedSales: 0,
        nonBrandedSales: 0,
      };

      const isBranded =
        row.keyword_text &&
        brandTerms.some((term) => row.keyword_text.toLowerCase().includes(term));
      const spend = parseFloat(row.spend) || 0;
      const sales = parseFloat(row.sales) || 0;

      if (isBranded) {
        existing.brandedSpend += spend;
        existing.brandedSales += sales;
      } else {
        existing.nonBrandedSpend += spend;
        existing.nonBrandedSales += sales;
      }

      dateMap.set(row.report_date, existing);
    }

    // Convert to sorted array
    return Array.from(dateMap.entries())
      .map(([date, metrics]) => ({
        date,
        ...metrics,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Chart 6: Average BSR vs Ad Spend (scatter plot)
   */
  async getBsrVsSpend(
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<BsrSpendPoint[]> {
    // Get SKU rankings (most recent snapshot in date range)
    const { data: rankings, error: rankError } = await this.supabase
      .from('sku_rankings')
      .select('asin, sku, category_rank, category_name, snapshot_date')
      .eq('client_id', clientId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: false });

    if (rankError) throw rankError;

    // Get unique ASINs with their latest ranking
    const asinRankings = new Map<
      string,
      { sku: string; categoryRank: number; categoryName: string }
    >();
    for (const row of rankings || []) {
      if (!asinRankings.has(row.asin)) {
        asinRankings.set(row.asin, {
          sku: row.sku || '',
          categoryRank: row.category_rank || 0,
          categoryName: row.category_name || '',
        });
      }
    }

    // Get advertising metrics aggregated by campaign -> need SKU mapping
    const { data: skuCampaigns, error: mappingError } = await this.supabase
      .from('sku_campaign_mapping')
      .select('sku, asin, campaign_id')
      .eq('client_id', clientId);

    if (mappingError) throw mappingError;

    // Map campaigns to ASINs
    const campaignToAsin = new Map<string, string>();
    for (const mapping of skuCampaigns || []) {
      if (mapping.asin) {
        campaignToAsin.set(mapping.campaign_id, mapping.asin);
      }
    }

    // Get advertising metrics
    const { data: adMetrics, error: adError } = await this.supabase
      .from('advertising_report_metrics')
      .select('campaign_id, spend, sales')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (adError) throw adError;

    // Aggregate ad spend by ASIN
    const asinAdMetrics = new Map<string, { spend: number; sales: number }>();
    for (const row of adMetrics || []) {
      const asin = campaignToAsin.get(row.campaign_id);
      if (!asin) continue;

      const existing = asinAdMetrics.get(asin) || { spend: 0, sales: 0 };
      existing.spend += parseFloat(row.spend) || 0;
      existing.sales += parseFloat(row.sales) || 0;
      asinAdMetrics.set(asin, existing);
    }

    // Combine data
    const result: BsrSpendPoint[] = [];
    for (const [asin, ranking] of asinRankings.entries()) {
      const adData = asinAdMetrics.get(asin) || { spend: 0, sales: 0 };
      if (ranking.categoryRank > 0) {
        result.push({
          asin,
          sku: ranking.sku,
          categoryRank: ranking.categoryRank,
          categoryName: ranking.categoryName,
          adSpend: adData.spend,
          adSales: adData.sales,
        });
      }
    }

    return result.sort((a, b) => a.categoryRank - b.categoryRank);
  }

  /**
   * Chart 7: Top 10 SKUs by TACOS (small multiples)
   */
  async getTopSkuTacos(
    clientId: string,
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<SkuTacosData[]> {
    // Get SKU campaign mappings
    const { data: skuCampaigns, error: mappingError } = await this.supabase
      .from('sku_campaign_mapping')
      .select('sku, asin, campaign_id')
      .eq('client_id', clientId);

    if (mappingError) throw mappingError;

    // Map campaigns to SKUs
    const campaignToSku = new Map<string, { sku: string; asin: string }>();
    for (const mapping of skuCampaigns || []) {
      campaignToSku.set(mapping.campaign_id, {
        sku: mapping.sku,
        asin: mapping.asin || '',
      });
    }

    // Get advertising metrics by date
    const { data: adMetrics, error: adError } = await this.supabase
      .from('advertising_report_metrics')
      .select('report_date, campaign_id, spend, sales')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (adError) throw adError;

    // Aggregate by SKU and date
    const skuDateMetrics = new Map<
      string,
      Map<string, { spend: number; sales: number }>
    >();
    const skuTotals = new Map<
      string,
      { asin: string; totalSpend: number; totalSales: number }
    >();

    for (const row of adMetrics || []) {
      const skuInfo = campaignToSku.get(row.campaign_id);
      if (!skuInfo) continue;

      // Update daily metrics
      if (!skuDateMetrics.has(skuInfo.sku)) {
        skuDateMetrics.set(skuInfo.sku, new Map());
      }
      const dateMap = skuDateMetrics.get(skuInfo.sku)!;
      const existing = dateMap.get(row.report_date) || { spend: 0, sales: 0 };
      existing.spend += parseFloat(row.spend) || 0;
      existing.sales += parseFloat(row.sales) || 0;
      dateMap.set(row.report_date, existing);

      // Update totals
      const totals = skuTotals.get(skuInfo.sku) || {
        asin: skuInfo.asin,
        totalSpend: 0,
        totalSales: 0,
      };
      totals.totalSpend += parseFloat(row.spend) || 0;
      totals.totalSales += parseFloat(row.sales) || 0;
      skuTotals.set(skuInfo.sku, totals);
    }

    // Get product names from product_performance
    const { data: products } = await this.supabase
      .from('product_performance')
      .select('sku, title')
      .eq('client_id', clientId);

    const skuNames = new Map<string, string>();
    for (const p of products || []) {
      if (p.sku && p.title) {
        skuNames.set(p.sku, p.title);
      }
    }

    // Convert to result format, sorted by total ad spend
    const result: SkuTacosData[] = Array.from(skuTotals.entries())
      .filter(([_, totals]) => totals.totalSpend > 0)
      .map(([sku, totals]) => {
        const dateMetrics = skuDateMetrics.get(sku)!;
        const dataPoints = Array.from(dateMetrics.entries())
          .map(([date, metrics]) => ({
            date,
            tacos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          sku,
          asin: totals.asin,
          productName: skuNames.get(sku),
          totalSales: totals.totalSales,
          adSpend: totals.totalSpend,
          tacos: totals.totalSales > 0 ? (totals.totalSpend / totals.totalSales) * 100 : 0,
          dataPoints,
        };
      })
      .sort((a, b) => b.adSpend - a.adSpend)
      .slice(0, limit);

    return result;
  }

  /**
   * Chart 8: Growth Decomposition (waterfall)
   */
  async getGrowthDecomposition(
    clientId: string,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
  ): Promise<GrowthDecomposition> {
    // Get current period data
    const currentSales = await this.getSalesBreakdown(clientId, currentStart, currentEnd);
    const currentSessions = await this.getSessionsRevenue(clientId, currentStart, currentEnd);

    // Get previous period data
    const previousSales = await this.getSalesBreakdown(clientId, previousStart, previousEnd);
    const previousSessions = await this.getSessionsRevenue(
      clientId,
      previousStart,
      previousEnd,
    );

    // Calculate totals for current period
    const currentTotals = {
      revenue: currentSales.reduce((sum, s) => sum + s.totalSales, 0),
      sessions: currentSessions.reduce((sum, s) => sum + s.sessions, 0),
      adSpend: currentSales.reduce((sum, s) => sum + s.adSpend, 0),
      adSales: currentSales.reduce((sum, s) => sum + s.adAttributedSales, 0),
      organicSales: currentSales.reduce((sum, s) => sum + s.organicSales, 0),
    };

    // Calculate totals for previous period
    const previousTotals = {
      revenue: previousSales.reduce((sum, s) => sum + s.totalSales, 0),
      sessions: previousSessions.reduce((sum, s) => sum + s.sessions, 0),
      adSpend: previousSales.reduce((sum, s) => sum + s.adSpend, 0),
      adSales: previousSales.reduce((sum, s) => sum + s.adAttributedSales, 0),
      organicSales: previousSales.reduce((sum, s) => sum + s.organicSales, 0),
    };

    // Calculate conversion rates
    const currentConversionRate =
      currentTotals.sessions > 0 ? currentTotals.revenue / currentTotals.sessions : 0;
    const previousConversionRate =
      previousTotals.sessions > 0 ? previousTotals.revenue / previousTotals.sessions : 0;

    // Decomposition calculations
    // Traffic contribution = (current sessions - previous sessions) * previous conversion rate
    const trafficContribution =
      (currentTotals.sessions - previousTotals.sessions) * previousConversionRate;

    // Conversion contribution = previous sessions * (current conversion rate - previous conversion rate)
    const conversionContribution =
      previousTotals.sessions * (currentConversionRate - previousConversionRate);

    // Ad contribution = current ad sales - previous ad sales
    const adContribution = currentTotals.adSales - previousTotals.adSales;

    // Organic contribution = current organic - previous organic
    const organicContribution = currentTotals.organicSales - previousTotals.organicSales;

    const percentChange =
      previousTotals.revenue > 0
        ? ((currentTotals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100
        : 0;

    return {
      baselineRevenue: previousTotals.revenue,
      trafficContribution,
      conversionContribution,
      adContribution,
      organicContribution,
      finalRevenue: currentTotals.revenue,
      percentChange,
    };
  }

  /**
   * Chart 9: Wasted Spend (keywords with spend but no orders)
   */
  async getWastedSpend(
    clientId: string,
    startDate: string,
    endDate: string,
    clickThreshold: number = 1,
  ): Promise<{ daily: WastedSpendPoint[]; keywords: WastedKeyword[] }> {
    // Get keyword-level advertising metrics
    const { data: keywordData, error: keywordError } = await this.supabase
      .from('advertising_report_metrics')
      .select('report_date, keyword_text, spend, clicks, orders')
      .eq('client_id', clientId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .neq('keyword_id', '');

    if (keywordError) throw keywordError;

    // Aggregate by date for daily wasted spend
    const dailyWasted = new Map<
      string,
      { spend: number; keywords: Set<string>; topKeywords: Map<string, { spend: number; clicks: number }> }
    >();

    // Track wasted keywords overall
    const wastedKeywords = new Map<
      string,
      { spend: number; clicks: number; dates: Set<string> }
    >();

    for (const row of keywordData || []) {
      if (!row.keyword_text) continue;
      const spend = parseFloat(row.spend) || 0;
      const clicks = row.clicks || 0;
      const orders = row.orders || 0;

      // Only count as wasted if spend > 0, clicks >= threshold, and no orders
      if (spend > 0 && clicks >= clickThreshold && orders === 0) {
        // Daily aggregation
        if (!dailyWasted.has(row.report_date)) {
          dailyWasted.set(row.report_date, {
            spend: 0,
            keywords: new Set(),
            topKeywords: new Map(),
          });
        }
        const daily = dailyWasted.get(row.report_date)!;
        daily.spend += spend;
        daily.keywords.add(row.keyword_text);

        const keywordMetric = daily.topKeywords.get(row.keyword_text) || { spend: 0, clicks: 0 };
        keywordMetric.spend += spend;
        keywordMetric.clicks += clicks;
        daily.topKeywords.set(row.keyword_text, keywordMetric);

        // Overall keyword aggregation
        const kwData = wastedKeywords.get(row.keyword_text) || {
          spend: 0,
          clicks: 0,
          dates: new Set(),
        };
        kwData.spend += spend;
        kwData.clicks += clicks;
        kwData.dates.add(row.report_date);
        wastedKeywords.set(row.keyword_text, kwData);
      }
    }

    // Convert daily to sorted array
    const dailyResult: WastedSpendPoint[] = Array.from(dailyWasted.entries())
      .map(([date, data]) => {
        // Get top 5 wasted keywords for this date
        const topWastedKeywords = Array.from(data.topKeywords.entries())
          .sort((a, b) => b[1].spend - a[1].spend)
          .slice(0, 5)
          .map(([keywordText, metrics]) => ({
            keywordText,
            spend: metrics.spend,
            clicks: metrics.clicks,
          }));

        return {
          date,
          totalWastedSpend: data.spend,
          keywordCount: data.keywords.size,
          topWastedKeywords,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Convert keywords to sorted array
    const keywordsResult: WastedKeyword[] = Array.from(wastedKeywords.entries())
      .map(([keywordText, data]) => ({
        keywordText,
        totalSpend: data.spend,
        totalClicks: data.clicks,
        dates: Array.from(data.dates).sort(),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return {
      daily: dailyResult,
      keywords: keywordsResult,
    };
  }

  /**
   * Brand Keywords CRUD operations
   */
  async getBrandKeywords(clientId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('brand_keywords')
      .select('keyword')
      .eq('client_id', clientId)
      .order('keyword');

    if (error) throw error;
    return (data || []).map((k) => k.keyword);
  }

  async addBrandKeyword(clientId: string, keyword: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_keywords')
      .upsert({ client_id: clientId, keyword: keyword.toLowerCase().trim() });

    if (error) throw error;
  }

  async removeBrandKeyword(clientId: string, keyword: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_keywords')
      .delete()
      .eq('client_id', clientId)
      .eq('keyword', keyword.toLowerCase().trim());

    if (error) throw error;
  }
}
