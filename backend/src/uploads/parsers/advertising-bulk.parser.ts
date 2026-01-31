import * as XLSX from 'xlsx';
import { BaseParser, ParseResult } from './base.parser';

export interface AdvertisingBulkRow {
  report_date: string;
  campaign_id: string;
  campaign_name: string;
  campaign_type: string; // SP, SB, SD
  campaign_status: string;
  ad_group_id: string;
  ad_group_name: string;
  keyword_id: string;
  keyword_text: string;
  match_type: string;
  targeting_type: string;
  sku: string;
  asin: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversion_rate: number;
}

/**
 * Parser for Amazon Advertising Bulk Operations Excel files
 * Handles multiple sheets: SP Campaigns, SB Campaigns, SD Campaigns, Search Term Reports
 */
export class AdvertisingBulkParser extends BaseParser<AdvertisingBulkRow> {
  private dateRange: { start: string; end: string } | null = null;

  getReportType(): string {
    return 'advertising_bulk';
  }

  getTableName(): string {
    return 'advertising_report_metrics';
  }

  /**
   * Extract date range from filename like "bulk-xxx-20251201-20251231-xxx.xlsx"
   */
  private extractDateFromFilename(filename?: string): string {
    if (filename) {
      const match = filename.match(/(\d{8})-(\d{8})/);
      if (match) {
        const startDate = match[1];
        const endDate = match[2];
        // Format as YYYY-MM-DD
        const start = `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
        const end = `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`;
        this.dateRange = { start, end };
        return end; // Use end date as the report date
      }
    }
    // Default to today
    return new Date().toISOString().split('T')[0];
  }

  parse(content: string, filename?: string): ParseResult<AdvertisingBulkRow> {
    this.resetErrors();
    console.log('=== ADVERTISING BULK PARSER START ===');
    console.log('Filename:', filename);
    console.log('Content starts with:', content.substring(0, 100));
    console.log('Content length:', content.length);

    const reportDate = this.extractDateFromFilename(filename);
    console.log('Report date:', reportDate);
    const data: AdvertisingBulkRow[] = [];

    try {
      // Content is base64 encoded Excel file
      let workbook: XLSX.WorkBook;

      const isBase64 = content.startsWith('data:') || content.includes('base64');
      console.log('Is base64 encoded:', isBase64);

      if (isBase64) {
        // Base64 encoded
        const base64Data = content.includes('base64,')
          ? content.split('base64,')[1]
          : content;
        console.log('Base64 data length:', base64Data.length);
        workbook = XLSX.read(base64Data, { type: 'base64' });
      } else {
        // Try as binary string
        console.log('Trying as binary string');
        workbook = XLSX.read(content, { type: 'binary' });
      }
      console.log('Workbook parsed successfully');

      // Log all sheet names for debugging
      console.log('Excel file contains sheets:', workbook.SheetNames);

      // Process each sheet based on name patterns (case-insensitive)
      for (const sheetName of workbook.SheetNames) {
        const lowerName = sheetName.toLowerCase();
        const ws = workbook.Sheets[sheetName];
        let sheetData: AdvertisingBulkRow[] = [];

        if (lowerName.includes('sponsored products') || lowerName.includes('sp campaigns') || lowerName === 'sp') {
          console.log(`Processing SP sheet: ${sheetName}`);
          sheetData = this.processCampaignSheet(ws, 'SP', reportDate);
        } else if (lowerName.includes('sponsored brands') || lowerName.includes('sb campaigns') || lowerName.includes('sb multi') || lowerName === 'sb') {
          console.log(`Processing SB sheet: ${sheetName}`);
          sheetData = this.processCampaignSheet(ws, 'SB', reportDate);
        } else if (lowerName.includes('sponsored display') || lowerName.includes('sd campaigns') || lowerName === 'sd') {
          console.log(`Processing SD sheet: ${sheetName}`);
          sheetData = this.processCampaignSheet(ws, 'SD', reportDate);
        } else if (lowerName.includes('search term')) {
          const type = lowerName.includes('sp') ? 'SP' : lowerName.includes('sb') ? 'SB' : 'SP';
          console.log(`Processing Search Term sheet: ${sheetName} as ${type}`);
          sheetData = this.processSearchTermSheet(ws, type, reportDate);
        } else {
          // Try to process unknown sheets as campaign data
          console.log(`Attempting to process unknown sheet: ${sheetName}`);
          sheetData = this.processCampaignSheet(ws, 'SP', reportDate);
        }

        console.log(`Sheet "${sheetName}" produced ${sheetData.length} rows`);
        data.push(...sheetData);
      }
    } catch (err) {
      console.error('=== EXCEL PARSE ERROR ===');
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      this.addError(0, `Failed to parse Excel file: ${err.message}`);
    }

    console.log('=== ADVERTISING BULK PARSER COMPLETE ===');
    console.log('Total rows extracted:', data.length);
    console.log('Errors:', this.errors.length);
    const result = this.createResult(data, data.length);
    if (this.dateRange) {
      result.metadata.dateRange = this.dateRange;
    }
    return result;
  }

  private processCampaignSheet(
    ws: XLSX.WorkSheet,
    campaignType: string,
    reportDate: string,
  ): AdvertisingBulkRow[] {
    const rows: AdvertisingBulkRow[] = [];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    // Log column names from first row for debugging
    if (jsonData.length > 0) {
      console.log('Sheet columns:', Object.keys(jsonData[0]));
    } else {
      console.log('Sheet is empty');
      return rows;
    }

    for (const row of jsonData) {
      // Skip rows without impressions (header rows or empty)
      const impressions = this.parseNumber(row['Impressions']);
      if (impressions === 0 && !row['Campaign ID']) continue;

      const entity = String(row['Entity'] || '').toLowerCase();

      // Determine if this is campaign, ad group, or keyword level
      let adGroupId = '';
      let keywordId = '';
      let keywordText = '';
      let matchType = '';

      if (entity === 'keyword' || entity === 'product targeting') {
        adGroupId = String(row['Ad Group ID'] || '');
        keywordId = String(row['Keyword ID'] || row['Product Targeting ID'] || '');
        keywordText = String(row['Keyword Text'] || row['Product Targeting Expression'] || '');
        matchType = String(row['Match Type'] || '');
      } else if (entity === 'ad group' || entity === 'ad') {
        adGroupId = String(row['Ad Group ID'] || '');
      }

      const campaignId = String(row['Campaign ID'] || '');
      if (!campaignId) continue;

      rows.push({
        report_date: reportDate,
        campaign_id: campaignId,
        campaign_name: String(row['Campaign Name'] || row['Campaign Name (Informational only)'] || ''),
        campaign_type: campaignType,
        campaign_status: String(row['State'] || row['Campaign State (Informational only)'] || ''),
        ad_group_id: adGroupId,
        ad_group_name: String(row['Ad Group Name'] || row['Ad Group Name (Informational only)'] || ''),
        keyword_id: keywordId,
        keyword_text: keywordText,
        match_type: matchType,
        targeting_type: String(row['Targeting Type'] || row['Tactic'] || ''),
        sku: String(row['SKU'] || ''),
        asin: String(row['ASIN (Informational only)'] || row['ASIN'] || ''),
        impressions: impressions,
        clicks: this.parseNumber(row['Clicks']),
        spend: this.parseNumber(row['Spend']),
        sales: this.parseNumber(row['Sales']),
        orders: this.parseNumber(row['Orders']),
        units: this.parseNumber(row['Units']),
        acos: this.parsePercentageValue(row['ACOS']),
        roas: this.parseNumber(row['ROAS']),
        ctr: this.parsePercentageValue(row['Click-through Rate']),
        cpc: this.parseNumber(row['CPC']),
        conversion_rate: this.parsePercentageValue(row['Conversion Rate']),
      });
    }

    return rows;
  }

  private processSearchTermSheet(
    ws: XLSX.WorkSheet,
    campaignType: string,
    reportDate: string,
  ): AdvertisingBulkRow[] {
    const rows: AdvertisingBulkRow[] = [];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    for (const row of jsonData) {
      const impressions = this.parseNumber(row['Impressions']);
      const campaignId = String(row['Campaign ID'] || '');
      if (!campaignId) continue;

      // For search term reports, we use the search term as the keyword
      const searchTerm = String(row['Customer Search Term'] || '');

      rows.push({
        report_date: reportDate,
        campaign_id: campaignId,
        campaign_name: String(row['Campaign Name (Informational only)'] || ''),
        campaign_type: campaignType,
        campaign_status: String(row['State'] || row['Campaign State (Informational only)'] || ''),
        ad_group_id: String(row['Ad Group ID'] || ''),
        ad_group_name: String(row['Ad Group Name (Informational only)'] || ''),
        keyword_id: String(row['Keyword ID'] || row['Product Targeting ID'] || ''),
        keyword_text: searchTerm || String(row['Keyword Text'] || row['Product Targeting Expression'] || ''),
        match_type: String(row['Match Type'] || ''),
        targeting_type: '',
        sku: '',
        asin: '',
        impressions: impressions,
        clicks: this.parseNumber(row['Clicks']),
        spend: this.parseNumber(row['Spend']),
        sales: this.parseNumber(row['Sales']),
        orders: this.parseNumber(row['Orders']),
        units: this.parseNumber(row['Units']),
        acos: this.parsePercentageValue(row['ACOS']),
        roas: this.parseNumber(row['ROAS']),
        ctr: this.parsePercentageValue(row['Click-through Rate']),
        cpc: this.parseNumber(row['CPC']),
        conversion_rate: this.parsePercentageValue(row['Conversion Rate']),
      });
    }

    return rows;
  }

  private parseNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    const str = String(value).replace(/[$,]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  private parsePercentageValue(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') {
      // If it's already a decimal (like 0.25), convert to percentage
      return value < 1 ? value * 100 : value;
    }
    const str = String(value).replace('%', '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }
}
