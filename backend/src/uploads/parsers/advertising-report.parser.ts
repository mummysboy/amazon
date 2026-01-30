import { BaseParser, ParseResult } from './base.parser';

export interface AdvertisingReportRow {
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
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversion_rate: number;
}

/**
 * Parser for Amazon Advertising Reports (Sponsored Products/Brands/Display)
 * Supports campaign, ad group, and keyword level reports
 *
 * Expected columns (flexible - will detect):
 * Date, Campaign ID, Campaign Name, Campaign Status, Ad Group ID, Ad Group Name,
 * Keyword ID, Keyword, Match Type, Targeting, Impressions, Clicks, Spend, Sales,
 * Orders, Units
 */
export class AdvertisingReportParser extends BaseParser<AdvertisingReportRow> {
  private columnMap: Map<string, number> = new Map();

  getReportType(): string {
    return 'advertising_report';
  }

  getTableName(): string {
    return 'advertising_report_metrics';
  }

  parse(content: string): ParseResult<AdvertisingReportRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: AdvertisingReportRow[] = [];
    const dates: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const campaignId = this.getColumn(values, 'campaign_id');
        if (!campaignId) {
          this.addError(rowNum, 'Missing Campaign ID', 'campaign_id');
          continue;
        }

        const reportDate =
          this.parseDate(this.getColumn(values, 'date')) ||
          new Date().toISOString().split('T')[0];

        const impressions = this.parseInt(this.getColumn(values, 'impressions'));
        const clicks = this.parseInt(this.getColumn(values, 'clicks'));
        const spend = this.parseCurrency(this.getColumn(values, 'spend'));
        const sales = this.parseCurrency(this.getColumn(values, 'sales'));
        const orders = this.parseInt(this.getColumn(values, 'orders'));

        // Calculate derived metrics
        const acos = sales > 0 ? spend / sales : 0;
        const roas = spend > 0 ? sales / spend : 0;
        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const conversionRate = clicks > 0 ? orders / clicks : 0;

        const row: AdvertisingReportRow = {
          report_date: reportDate,
          campaign_id: campaignId,
          campaign_name: this.getColumn(values, 'campaign_name'),
          campaign_type: this.detectCampaignType(
            this.getColumn(values, 'campaign_type'),
            this.getColumn(values, 'campaign_name'),
          ),
          campaign_status: this.getColumn(values, 'campaign_status'),
          ad_group_id: this.getColumn(values, 'ad_group_id'),
          ad_group_name: this.getColumn(values, 'ad_group_name'),
          keyword_id: this.getColumn(values, 'keyword_id'),
          keyword_text: this.getColumn(values, 'keyword_text'),
          match_type: this.getColumn(values, 'match_type'),
          targeting_type: this.getColumn(values, 'targeting_type'),
          impressions,
          clicks,
          spend,
          sales,
          orders,
          units: this.parseInt(this.getColumn(values, 'units')),
          acos,
          roas,
          ctr,
          cpc,
          conversion_rate: conversionRate,
        };

        data.push(row);
        dates.push(reportDate);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length, this.extractDateRange(dates));
  }

  private buildColumnMap(headers: string[]): void {
    this.columnMap.clear();

    const mappings: Record<string, string[]> = {
      date: ['date', 'report date', 'day'],
      campaign_id: ['campaign id', 'campaignid'],
      campaign_name: ['campaign name', 'campaignname', 'campaign'],
      campaign_type: ['campaign type', 'type'],
      campaign_status: ['campaign status', 'status', 'state'],
      ad_group_id: ['ad group id', 'adgroupid'],
      ad_group_name: ['ad group name', 'adgroupname', 'ad group'],
      keyword_id: ['keyword id', 'keywordid'],
      keyword_text: ['keyword', 'keyword text', 'search term', 'targeting'],
      match_type: ['match type', 'matchtype'],
      targeting_type: ['targeting type', 'targeting'],
      impressions: ['impressions', 'impr'],
      clicks: ['clicks'],
      spend: ['spend', 'cost'],
      sales: ['sales', '7 day total sales', '14 day total sales', 'total sales'],
      orders: ['orders', '7 day total orders', '14 day total orders', 'total orders'],
      units: ['units', '7 day total units', '14 day total units', 'total units'],
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();

      for (const [key, variants] of Object.entries(mappings)) {
        if (variants.some((v) => header.includes(v))) {
          if (!this.columnMap.has(key)) {
            this.columnMap.set(key, i);
          }
        }
      }
    }
  }

  private getColumn(values: string[], key: string): string {
    const index = this.columnMap.get(key);
    if (index === undefined || index >= values.length) {
      return '';
    }
    return this.cleanString(values[index]);
  }

  private detectCampaignType(explicitType: string, campaignName: string): string {
    if (explicitType) return explicitType.toUpperCase();

    const name = campaignName.toLowerCase();
    if (name.includes('sponsored brand') || name.includes(' sb ')) return 'SB';
    if (name.includes('sponsored display') || name.includes(' sd ')) return 'SD';
    return 'SP'; // Default to Sponsored Products
  }
}
