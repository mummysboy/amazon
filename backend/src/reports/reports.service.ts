import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ReportsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }

  // ========================================
  // EXISTING REPORT METHODS
  // ========================================

  async getDailySales(clientId: string) {
    const { data, error } = await this.supabase
      .from('daily_sales_traffic')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getProductPerformance(clientId: string) {
    const { data, error } = await this.supabase
      .from('product_performance')
      .select('*')
      .eq('client_id', clientId)
      .order('ordered_product_sales', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getSearchTerms(clientId: string) {
    const { data, error } = await this.supabase
      .from('search_term_performance')
      .select('*')
      .eq('client_id', clientId)
      .order('search_query_volume', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getInventory(clientId: string) {
    const { data, error } = await this.supabase
      .from('inventory_snapshots')
      .select('*')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  // ========================================
  // NEW REPORT METHODS
  // ========================================

  async getAdvertisingMetrics(
    clientId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      campaignId?: string;
      campaignType?: string;
      limit?: number;
    },
  ) {
    let query = this.supabase
      .from('advertising_report_metrics')
      .select('*')
      .eq('client_id', clientId);

    if (options?.startDate) {
      query = query.gte('report_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('report_date', options.endDate);
    }
    if (options?.campaignId) {
      query = query.eq('campaign_id', options.campaignId);
    }
    if (options?.campaignType) {
      query = query.eq('campaign_type', options.campaignType);
    }

    query = query.order('report_date', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getSkuCampaignMapping(
    clientId: string,
    options?: {
      sku?: string;
      campaignType?: string;
    },
  ) {
    let query = this.supabase
      .from('sku_campaign_mapping')
      .select('*')
      .eq('client_id', clientId);

    if (options?.sku) {
      query = query.eq('sku', options.sku);
    }
    if (options?.campaignType) {
      query = query.eq('campaign_type', options.campaignType);
    }

    query = query.order('campaign_name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getParentChildMapping(
    clientId: string,
    options?: {
      parentAsin?: string;
      childAsin?: string;
    },
  ) {
    let query = this.supabase
      .from('parent_child_mapping')
      .select('*')
      .eq('client_id', clientId);

    if (options?.parentAsin) {
      query = query.eq('parent_asin', options.parentAsin);
    }
    if (options?.childAsin) {
      query = query.eq('child_asin', options.childAsin);
    }

    query = query.order('parent_asin', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getRestockingLimits(
    clientId: string,
    options?: {
      snapshotDate?: string;
      storageType?: string;
    },
  ) {
    let query = this.supabase
      .from('restocking_limits')
      .select('*')
      .eq('client_id', clientId);

    if (options?.snapshotDate) {
      query = query.eq('snapshot_date', options.snapshotDate);
    }
    if (options?.storageType) {
      query = query.eq('storage_type', options.storageType);
    }

    query = query.order('snapshot_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getIdqScores(
    clientId: string,
    options?: {
      snapshotDate?: string;
      sku?: string;
      hasIssues?: boolean;
    },
  ) {
    let query = this.supabase
      .from('idq_scores')
      .select('*')
      .eq('client_id', clientId);

    if (options?.snapshotDate) {
      query = query.eq('snapshot_date', options.snapshotDate);
    }
    if (options?.sku) {
      query = query.eq('sku', options.sku);
    }
    if (options?.hasIssues) {
      query = query.or(
        'stranded_inventory_flag.eq.true,excess_inventory_flag.eq.true,aged_inventory_flag.eq.true',
      );
    }

    query = query.order('idq_score', { ascending: true }); // Lower scores first (worse)

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getSkuRankings(
    clientId: string,
    options?: {
      snapshotDate?: string;
      asin?: string;
      minRank?: number;
      maxRank?: number;
    },
  ) {
    let query = this.supabase
      .from('sku_rankings')
      .select('*')
      .eq('client_id', clientId);

    if (options?.snapshotDate) {
      query = query.eq('snapshot_date', options.snapshotDate);
    }
    if (options?.asin) {
      query = query.eq('asin', options.asin);
    }
    if (options?.minRank) {
      query = query.gte('category_rank', options.minRank);
    }
    if (options?.maxRank) {
      query = query.lte('category_rank', options.maxRank);
    }

    query = query.order('category_rank', { ascending: true }); // Best ranks first

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // ========================================
  // AGGREGATED DATA METHODS
  // ========================================

  /**
   * Get campaign summary with totals
   */
  async getAdvertisingSummary(
    clientId: string,
    options?: { startDate?: string; endDate?: string },
  ) {
    const metrics = await this.getAdvertisingMetrics(clientId, options);

    // Aggregate by campaign
    const campaignMap = new Map<
      string,
      {
        campaign_id: string;
        campaign_name: string;
        campaign_type: string;
        impressions: number;
        clicks: number;
        spend: number;
        sales: number;
        orders: number;
      }
    >();

    for (const row of metrics || []) {
      const existing = campaignMap.get(row.campaign_id) || {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        campaign_type: row.campaign_type,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
      };

      existing.impressions += row.impressions || 0;
      existing.clicks += row.clicks || 0;
      existing.spend += parseFloat(row.spend) || 0;
      existing.sales += parseFloat(row.sales) || 0;
      existing.orders += row.orders || 0;

      campaignMap.set(row.campaign_id, existing);
    }

    const campaigns = Array.from(campaignMap.values()).map((c) => ({
      ...c,
      acos: c.sales > 0 ? (c.spend / c.sales) * 100 : 0,
      roas: c.spend > 0 ? c.sales / c.spend : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    }));

    const totals = {
      impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
      sales: campaigns.reduce((sum, c) => sum + c.sales, 0),
      orders: campaigns.reduce((sum, c) => sum + c.orders, 0),
    };

    return {
      campaigns: campaigns.sort((a, b) => b.spend - a.spend),
      totals: {
        ...totals,
        acos: totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0,
        roas: totals.spend > 0 ? totals.sales / totals.spend : 0,
      },
    };
  }

  /**
   * Get latest restocking status
   */
  async getLatestRestockingStatus(clientId: string) {
    // Get the most recent snapshot date
    const { data: latest } = await this.supabase
      .from('restocking_limits')
      .select('snapshot_date')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return { limits: [], snapshotDate: null };
    }

    const limits = await this.getRestockingLimits(clientId, {
      snapshotDate: latest.snapshot_date,
    });

    return {
      limits,
      snapshotDate: latest.snapshot_date,
    };
  }

  /**
   * Get inventory health summary
   */
  async getInventoryHealthSummary(clientId: string) {
    // Get the most recent snapshot date
    const { data: latest } = await this.supabase
      .from('idq_scores')
      .select('snapshot_date')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return { summary: null, snapshotDate: null };
    }

    const scores = await this.getIdqScores(clientId, {
      snapshotDate: latest.snapshot_date,
    });

    const summary = {
      totalSkus: scores?.length || 0,
      strandedCount: scores?.filter((s) => s.stranded_inventory_flag).length || 0,
      excessCount: scores?.filter((s) => s.excess_inventory_flag).length || 0,
      agedCount: scores?.filter((s) => s.aged_inventory_flag).length || 0,
      totalStrandedUnits: scores?.reduce((sum, s) => sum + (s.stranded_units || 0), 0) || 0,
      totalExcessUnits: scores?.reduce((sum, s) => sum + (s.excess_units || 0), 0) || 0,
      totalAged90Units: scores?.reduce((sum, s) => sum + (s.aged_90_day_units || 0), 0) || 0,
      totalAged180Units: scores?.reduce((sum, s) => sum + (s.aged_180_day_units || 0), 0) || 0,
      totalAged365Units: scores?.reduce((sum, s) => sum + (s.aged_365_day_units || 0), 0) || 0,
      estimatedStorageFees: scores?.reduce(
        (sum, s) => sum + parseFloat(String(s.estimated_storage_fees || 0)),
        0,
      ) || 0,
      averageIdqScore:
        scores && scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.idq_score || 0), 0) / scores.length
          : 0,
    };

    return {
      summary,
      snapshotDate: latest.snapshot_date,
    };
  }
}
