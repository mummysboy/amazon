import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ParserFactory,
  ReportType,
  REPORT_TYPE_INFO,
} from './parser.factory';
import { ParseResult, ParseMetadata } from './parsers/base.parser';
import {
  IngestionLoggerService,
  DataSourceType,
} from '../common/services/ingestion-logger.service';

// Import row types for type safety
import { DailySalesRow } from './parsers/daily-sales.parser';
import { ProductPerformanceRow, ProductPerformanceParser } from './parsers/product-performance.parser';
import { ParentPerformanceRow, ParentPerformanceParser } from './parsers/parent-performance.parser';
import { SearchTermRow, SearchTermsParser } from './parsers/search-terms.parser';
import { InventoryRow } from './parsers/inventory.parser';
import { AdvertisingReportRow } from './parsers/advertising-report.parser';
import { AdvertisingBulkRow } from './parsers/advertising-bulk.parser';
import { SkuCampaignMappingRow } from './parsers/sku-campaign-mapping.parser';
import { ParentChildRow } from './parsers/parent-child.parser';
import { RestockingLimitsRow } from './parsers/restocking-limits.parser';
import { IdqScoreRow } from './parsers/idq-scores.parser';
import { SkuRankingRow } from './parsers/sku-rankings.parser';

export interface UploadResult {
  success: boolean;
  reportType: string;
  inserted: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  sessionId?: string;
}

export interface UploadParams {
  clientId: string;
  organizationId: string;
  userId: string;
  reportType: ReportType;
  content: string;
  fileName?: string;
  fileSizeBytes?: number;
}

@Injectable()
export class UploadsService {
  private supabase: SupabaseClient;

  constructor(private readonly ingestionLogger: IngestionLoggerService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }

  /**
   * Process an upload with full session tracking and audit logging
   */
  async processUpload(params: UploadParams): Promise<UploadResult> {
    const { clientId, organizationId, userId, reportType, content, fileName, fileSizeBytes } = params;

    // Create upload session for tracking
    const sessionId = await this.ingestionLogger.createUploadSession({
      organizationId,
      clientId,
      userId,
      reportType,
      fileName,
      fileSizeBytes,
    });

    try {
      await this.ingestionLogger.markSessionProcessing(sessionId);

      // Get the appropriate parser
      const parser = ParserFactory.getParser(reportType);
      const parseResult = parser.parse(content);

      if (parseResult.data.length === 0) {
        await this.ingestionLogger.markSessionCompleted(sessionId, {
          recordsProcessed: parseResult.metadata.totalRows,
          recordsInserted: 0,
          recordsSkipped: parseResult.metadata.skippedRows,
        });

        return {
          success: true,
          reportType,
          inserted: 0,
          skipped: parseResult.metadata.skippedRows,
          errors: parseResult.errors.length,
          sessionId,
        };
      }

      // Save to database based on report type
      const saveResult = await this.saveData(
        clientId,
        reportType,
        parseResult,
        sessionId,
      );

      // Log the ingestion
      const tableInfo = REPORT_TYPE_INFO[reportType];
      await this.ingestionLogger.logIngestion({
        organizationId,
        clientId,
        sourceType: 'manual_upload',
        sourceId: sessionId,
        tableName: tableInfo.tableName,
        operation: 'upsert',
        recordCount: saveResult.inserted,
        dateRangeStart: parseResult.metadata.dateRange?.start,
        dateRangeEnd: parseResult.metadata.dateRange?.end,
      });

      // Mark session completed
      await this.ingestionLogger.markSessionCompleted(sessionId, {
        recordsProcessed: parseResult.metadata.totalRows,
        recordsInserted: saveResult.inserted,
        recordsUpdated: saveResult.updated,
        recordsSkipped: parseResult.metadata.skippedRows,
      });

      return {
        success: true,
        reportType,
        inserted: saveResult.inserted,
        updated: saveResult.updated,
        skipped: parseResult.metadata.skippedRows,
        errors: parseResult.errors.length,
        sessionId,
      };
    } catch (error) {
      await this.ingestionLogger.markSessionFailed(
        sessionId,
        error.message || 'Unknown error',
      );

      throw error;
    }
  }

  /**
   * Save parsed data to the appropriate table
   */
  private async saveData(
    clientId: string,
    reportType: ReportType,
    parseResult: ParseResult<unknown>,
    sessionId: string,
  ): Promise<{ inserted: number; updated?: number }> {
    switch (reportType) {
      case 'daily_sales':
        return this.saveDailySales(
          clientId,
          parseResult.data as DailySalesRow[],
          sessionId,
        );

      case 'product_performance':
        return this.saveProductPerformance(
          clientId,
          parseResult.data as ProductPerformanceRow[],
          sessionId,
        );

      case 'parent_performance':
        return this.saveParentPerformance(
          clientId,
          parseResult.data as ParentPerformanceRow[],
          sessionId,
        );

      case 'search_terms':
        return this.saveSearchTerms(
          clientId,
          parseResult.data as SearchTermRow[],
          sessionId,
        );

      case 'inventory':
        return this.saveInventory(
          clientId,
          parseResult.data as InventoryRow[],
          sessionId,
        );

      case 'advertising_report':
        return this.saveAdvertisingReport(
          clientId,
          parseResult.data as AdvertisingReportRow[],
          sessionId,
        );

      case 'advertising_bulk':
        return this.saveAdvertisingBulk(
          clientId,
          parseResult.data as AdvertisingBulkRow[],
          sessionId,
        );

      case 'sku_campaign_mapping':
        return this.saveSkuCampaignMapping(
          clientId,
          parseResult.data as SkuCampaignMappingRow[],
          sessionId,
        );

      case 'parent_child':
        return this.saveParentChildMapping(
          clientId,
          parseResult.data as ParentChildRow[],
          sessionId,
        );

      case 'restocking_limits':
        return this.saveRestockingLimits(
          clientId,
          parseResult.data as RestockingLimitsRow[],
          sessionId,
        );

      case 'idq_scores':
        return this.saveIdqScores(
          clientId,
          parseResult.data as IdqScoreRow[],
          sessionId,
        );

      case 'sku_rankings':
        return this.saveSkuRankings(
          clientId,
          parseResult.data as SkuRankingRow[],
          sessionId,
        );

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  // ========================================
  // EXISTING REPORT SAVE METHODS (Updated)
  // ========================================

  private async saveDailySales(
    clientId: string,
    data: DailySalesRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('daily_sales_traffic')
      .upsert(records, { onConflict: 'client_id,date' })
      .select();

    if (error) {
      console.error('Daily sales save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveProductPerformance(
    clientId: string,
    data: ProductPerformanceRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    // Deduplicate by child_asin
    const parser = ParserFactory.getParser('product_performance') as ProductPerformanceParser;
    const deduped = parser.deduplicate(data);

    const records = deduped.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('product_performance')
      .upsert(records, { onConflict: 'client_id,child_asin' })
      .select();

    if (error) {
      console.error('Product performance save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveParentPerformance(
    clientId: string,
    data: ParentPerformanceRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    // Deduplicate by parent_asin
    const parser = ParserFactory.getParser('parent_performance') as ParentPerformanceParser;
    const deduped = parser.deduplicate(data);

    const records = deduped.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('parent_performance')
      .upsert(records, { onConflict: 'client_id,parent_asin' })
      .select();

    if (error) {
      console.error('Parent performance save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveSearchTerms(
    clientId: string,
    data: SearchTermRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    // Deduplicate
    const parser = ParserFactory.getParser('search_terms') as SearchTermsParser;
    const deduped = parser.deduplicate(data);

    const records = deduped.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('search_term_performance')
      .upsert(records, { onConflict: 'client_id,search_term,reporting_date' })
      .select();

    if (error) {
      console.error('Search terms save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveInventory(
    clientId: string,
    data: InventoryRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const snapshotDate = new Date().toISOString().split('T')[0];

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      snapshot_date: snapshotDate,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('inventory_snapshots')
      .upsert(records, { onConflict: 'client_id,sku,warehouse_condition,snapshot_date' })
      .select();

    if (error) {
      console.error('Inventory save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  // ========================================
  // NEW REPORT SAVE METHODS
  // ========================================

  private async saveAdvertisingReport(
    clientId: string,
    data: AdvertisingReportRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      // Ensure ad_group_id and keyword_id are empty strings, not null
      ad_group_id: row.ad_group_id || '',
      keyword_id: row.keyword_id || '',
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    // Batch insert in chunks to avoid payload limits
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const { data: result, error } = await this.supabase
        .from('advertising_report_metrics')
        .upsert(chunk, {
          onConflict: 'client_id,report_date,campaign_id,ad_group_id,keyword_id',
        })
        .select();

      if (error) {
        console.error('Advertising report save error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      inserted += result?.length || 0;
    }

    return { inserted };
  }

  private async saveAdvertisingBulk(
    clientId: string,
    data: AdvertisingBulkRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    // Deduplicate by unique key, aggregating metrics for duplicates
    const dedupMap = new Map<string, {
      client_id: string;
      report_date: string;
      campaign_id: string;
      campaign_name: string;
      campaign_type: string;
      campaign_status: string;
      ad_group_id: string;
      ad_group_name: string;
      keyword_id: string;
      keyword_text: string;
      match_type: string;
      targeting_type: string;
      impressions: number;
      clicks: number;
      spend: number;
      sales: number;
      orders: number;
      units: number;
      data_source_type: DataSourceType;
      data_source_id: string;
    }>();

    for (const row of data) {
      const key = `${clientId}|${row.report_date}|${row.campaign_id}|${row.ad_group_id || ''}|${row.keyword_id || ''}`;

      const existing = dedupMap.get(key);
      if (existing) {
        // Aggregate metrics
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.spend += row.spend;
        existing.sales += row.sales;
        existing.orders += row.orders;
        existing.units += row.units;
      } else {
        dedupMap.set(key, {
          client_id: clientId,
          report_date: row.report_date,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          campaign_type: row.campaign_type,
          campaign_status: row.campaign_status,
          ad_group_id: row.ad_group_id || '',
          ad_group_name: row.ad_group_name,
          keyword_id: row.keyword_id || '',
          keyword_text: row.keyword_text,
          match_type: row.match_type,
          targeting_type: row.targeting_type,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.spend,
          sales: row.sales,
          orders: row.orders,
          units: row.units,
          data_source_type: 'manual_upload' as DataSourceType,
          data_source_id: sessionId,
        });
      }
    }

    // Calculate derived metrics after aggregation
    const records = Array.from(dedupMap.values()).map((r) => ({
      ...r,
      acos: r.sales > 0 ? r.spend / r.sales : 0,
      roas: r.spend > 0 ? r.sales / r.spend : 0,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
      cpc: r.clicks > 0 ? r.spend / r.clicks : 0,
      conversion_rate: r.clicks > 0 ? r.orders / r.clicks : 0,
    }));

    console.log(`Deduplicated ${data.length} rows to ${records.length} unique records`);

    // Batch insert in chunks
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const { data: result, error } = await this.supabase
        .from('advertising_report_metrics')
        .upsert(chunk, {
          onConflict: 'client_id,report_date,campaign_id,ad_group_id,keyword_id',
        })
        .select();

      if (error) {
        console.error('Advertising bulk save error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      inserted += result?.length || 0;
    }

    // Also extract and save SKU-campaign mappings
    const skuMappings = new Map<string, { sku: string; asin: string; campaign_id: string; campaign_name: string }>();
    for (const row of data) {
      if (row.sku && row.campaign_id) {
        const key = `${row.sku}|${row.campaign_id}`;
        if (!skuMappings.has(key)) {
          skuMappings.set(key, {
            sku: row.sku,
            asin: row.asin || '',
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
          });
        }
      }
    }

    if (skuMappings.size > 0) {
      const mappingRecords = Array.from(skuMappings.values()).map((m) => ({
        client_id: clientId,
        sku: m.sku,
        asin: m.asin,
        campaign_id: m.campaign_id,
        campaign_name: m.campaign_name,
        data_source_type: 'manual_upload' as DataSourceType,
        data_source_id: sessionId,
      }));

      console.log(`Saving ${mappingRecords.length} SKU-campaign mappings`);

      const { error: mappingError } = await this.supabase
        .from('sku_campaign_mapping')
        .upsert(mappingRecords, {
          onConflict: 'client_id,sku,campaign_id',
        });

      if (mappingError) {
        console.error('SKU mapping save error:', mappingError);
        // Don't throw - continue even if mapping fails
      }
    }

    return { inserted };
  }

  private async saveSkuCampaignMapping(
    clientId: string,
    data: SkuCampaignMappingRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('sku_campaign_mapping')
      .upsert(records, { onConflict: 'client_id,sku,campaign_id' })
      .select();

    if (error) {
      console.error('SKU campaign mapping save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveParentChildMapping(
    clientId: string,
    data: ParentChildRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      parent_asin: row.parent_asin,
      child_asin: row.child_asin,
      relationship_type: row.relationship_type,
      variation_attributes: row.variation_attributes,
      marketplace_id: row.marketplace_id,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('parent_child_mapping')
      .upsert(records, { onConflict: 'client_id,parent_asin,child_asin' })
      .select();

    if (error) {
      console.error('Parent-child mapping save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveRestockingLimits(
    clientId: string,
    data: RestockingLimitsRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('restocking_limits')
      .upsert(records, { onConflict: 'client_id,storage_type,snapshot_date' })
      .select();

    if (error) {
      console.error('Restocking limits save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveIdqScores(
    clientId: string,
    data: IdqScoreRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('idq_scores')
      .upsert(records, { onConflict: 'client_id,sku,snapshot_date' })
      .select();

    if (error) {
      console.error('IDQ scores save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  private async saveSkuRankings(
    clientId: string,
    data: SkuRankingRow[],
    sessionId: string,
  ): Promise<{ inserted: number }> {
    if (data.length === 0) {
      return { inserted: 0 };
    }

    const records = data.map((row) => ({
      client_id: clientId,
      ...row,
      data_source_type: 'manual_upload' as DataSourceType,
      data_source_id: sessionId,
    }));

    const { data: result, error } = await this.supabase
      .from('sku_rankings')
      .upsert(records, { onConflict: 'client_id,asin,snapshot_date' })
      .select();

    if (error) {
      console.error('SKU rankings save error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return { inserted: result?.length || 0 };
  }

  // ========================================
  // UPLOAD HISTORY
  // ========================================

  async getUploadHistory(
    organizationId: string,
    options?: { clientId?: string; limit?: number; offset?: number },
  ) {
    return this.ingestionLogger.getUploadHistory(organizationId, options);
  }

  /**
   * Delete an upload session and its associated data
   */
  async deleteUpload(
    sessionId: string,
    reportType: string,
  ): Promise<{ success: boolean; deletedRecords: number }> {
    console.log(`Deleting upload session: ${sessionId}, type: ${reportType}`);

    // Map report types to their table names
    const tableMap: Record<string, string> = {
      daily_sales: 'daily_sales_traffic',
      product_performance: 'product_performance',
      parent_performance: 'parent_performance',
      search_terms: 'search_term_performance',
      inventory: 'inventory_snapshots',
      advertising_report: 'advertising_report_metrics',
      advertising_bulk: 'advertising_report_metrics',
      sku_campaign_mapping: 'sku_campaign_mapping',
      parent_child: 'parent_child_mapping',
      restocking_limits: 'restocking_limits',
      idq_scores: 'idq_scores',
      sku_rankings: 'sku_rankings',
    };

    const tableName = tableMap[reportType];
    let deletedRecords = 0;

    if (tableName) {
      // Delete data from the report table
      const { data: deletedData, error: dataError } = await this.supabase
        .from(tableName)
        .delete()
        .eq('data_source_id', sessionId)
        .select('id');

      if (dataError) {
        console.error(`Error deleting from ${tableName}:`, dataError);
        // Don't throw - continue to delete session even if data deletion fails
      } else {
        deletedRecords = deletedData?.length || 0;
        console.log(`Deleted ${deletedRecords} records from ${tableName}`);
      }
    }

    // Delete from ingestion log
    const { error: logError } = await this.supabase
      .from('data_ingestion_log')
      .delete()
      .eq('source_id', sessionId);

    if (logError) {
      console.error('Error deleting ingestion log:', logError);
    }

    // Delete the upload session
    const { error: sessionError } = await this.supabase
      .from('upload_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error deleting upload session:', sessionError);
      throw new Error(`Failed to delete session: ${sessionError.message}`);
    }

    console.log(`Successfully deleted session ${sessionId}`);
    return { success: true, deletedRecords };
  }
}
