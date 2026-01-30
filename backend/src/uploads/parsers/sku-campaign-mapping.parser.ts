import { BaseParser, ParseResult } from './base.parser';

export interface SkuCampaignMappingRow {
  sku: string;
  asin: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  campaign_type: string;
  targeting_type: string;
}

/**
 * Parser for SKU to Campaign Mapping files
 * Maps SKUs to their associated advertising campaigns
 *
 * Expected columns:
 * SKU, ASIN, Campaign ID, Campaign Name, Ad Group ID, Ad Group Name, Campaign Type, Targeting Type
 */
export class SkuCampaignMappingParser extends BaseParser<SkuCampaignMappingRow> {
  private columnMap: Map<string, number> = new Map();

  getReportType(): string {
    return 'sku_campaign_mapping';
  }

  getTableName(): string {
    return 'sku_campaign_mapping';
  }

  parse(content: string): ParseResult<SkuCampaignMappingRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: SkuCampaignMappingRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const sku = this.getColumn(values, 'sku');
        const campaignId = this.getColumn(values, 'campaign_id');

        if (!sku) {
          this.addError(rowNum, 'Missing SKU', 'sku');
          continue;
        }

        if (!campaignId) {
          this.addError(rowNum, 'Missing Campaign ID', 'campaign_id');
          continue;
        }

        const row: SkuCampaignMappingRow = {
          sku,
          asin: this.getColumn(values, 'asin'),
          campaign_id: campaignId,
          campaign_name: this.getColumn(values, 'campaign_name'),
          ad_group_id: this.getColumn(values, 'ad_group_id'),
          ad_group_name: this.getColumn(values, 'ad_group_name'),
          campaign_type: this.normalizeCampaignType(
            this.getColumn(values, 'campaign_type'),
          ),
          targeting_type: this.normalizeTargetingType(
            this.getColumn(values, 'targeting_type'),
          ),
        };

        data.push(row);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length);
  }

  private buildColumnMap(headers: string[]): void {
    this.columnMap.clear();

    const mappings: Record<string, string[]> = {
      sku: ['sku', 'seller sku', 'merchant sku'],
      asin: ['asin', 'child asin', 'product asin'],
      campaign_id: ['campaign id', 'campaignid'],
      campaign_name: ['campaign name', 'campaignname', 'campaign'],
      ad_group_id: ['ad group id', 'adgroupid'],
      ad_group_name: ['ad group name', 'adgroupname', 'ad group'],
      campaign_type: ['campaign type', 'type', 'ad type'],
      targeting_type: ['targeting type', 'targeting', 'strategy'],
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

  private normalizeCampaignType(type: string): string {
    if (!type) return '';
    const upper = type.toUpperCase();
    if (upper.includes('BRAND') || upper === 'SB') return 'SB';
    if (upper.includes('DISPLAY') || upper === 'SD') return 'SD';
    if (upper.includes('PRODUCT') || upper === 'SP') return 'SP';
    return upper;
  }

  private normalizeTargetingType(type: string): string {
    if (!type) return '';
    const lower = type.toLowerCase();
    if (lower.includes('auto')) return 'auto';
    if (lower.includes('manual')) return 'manual';
    if (lower.includes('keyword')) return 'keyword';
    if (lower.includes('product')) return 'product';
    return lower;
  }
}
