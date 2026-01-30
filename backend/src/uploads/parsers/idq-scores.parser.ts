import { BaseParser, ParseResult } from './base.parser';

export interface IdqScoreRow {
  sku: string;
  asin: string;
  idq_score: number;
  stranded_inventory_flag: boolean;
  excess_inventory_flag: boolean;
  aged_inventory_flag: boolean;
  stranded_units: number;
  excess_units: number;
  aged_90_day_units: number;
  aged_180_day_units: number;
  aged_365_day_units: number;
  estimated_storage_fees: number;
  recommended_action: string;
  snapshot_date: string;
}

/**
 * Parser for IDQ (Inventory Quality) / FBA Inventory Health reports
 * Tracks inventory quality scores and stranded/excess/aged inventory
 *
 * Expected columns:
 * SKU, ASIN, IDQ Score, Stranded, Excess, Aged 90+, Aged 180+, Aged 365+,
 * Storage Fees, Recommended Action, Date
 */
export class IdqScoresParser extends BaseParser<IdqScoreRow> {
  private columnMap: Map<string, number> = new Map();

  getReportType(): string {
    return 'idq_scores';
  }

  getTableName(): string {
    return 'idq_scores';
  }

  parse(content: string): ParseResult<IdqScoreRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: IdqScoreRow[] = [];
    const dates: string[] = [];

    // Default snapshot date if not in file
    const defaultDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const sku = this.getColumn(values, 'sku');
        if (!sku) {
          this.addError(rowNum, 'Missing SKU', 'sku');
          continue;
        }

        const snapshotDate =
          this.parseDate(this.getColumn(values, 'date')) || defaultDate;

        const strandedUnits = this.parseInt(this.getColumn(values, 'stranded_units'));
        const excessUnits = this.parseInt(this.getColumn(values, 'excess_units'));
        const aged90 = this.parseInt(this.getColumn(values, 'aged_90'));
        const aged180 = this.parseInt(this.getColumn(values, 'aged_180'));
        const aged365 = this.parseInt(this.getColumn(values, 'aged_365'));

        const row: IdqScoreRow = {
          sku,
          asin: this.getColumn(values, 'asin'),
          idq_score: this.parseInt(this.getColumn(values, 'idq_score')),
          stranded_inventory_flag: strandedUnits > 0 ||
            this.parseBoolean(this.getColumn(values, 'stranded_flag')),
          excess_inventory_flag: excessUnits > 0 ||
            this.parseBoolean(this.getColumn(values, 'excess_flag')),
          aged_inventory_flag: aged90 > 0 || aged180 > 0 || aged365 > 0,
          stranded_units: strandedUnits,
          excess_units: excessUnits,
          aged_90_day_units: aged90,
          aged_180_day_units: aged180,
          aged_365_day_units: aged365,
          estimated_storage_fees: this.parseCurrency(
            this.getColumn(values, 'storage_fees'),
          ),
          recommended_action: this.normalizeAction(
            this.getColumn(values, 'recommended_action'),
          ),
          snapshot_date: snapshotDate,
        };

        data.push(row);
        dates.push(snapshotDate);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length, this.extractDateRange(dates));
  }

  private buildColumnMap(headers: string[]): void {
    this.columnMap.clear();

    const mappings: Record<string, string[]> = {
      sku: ['sku', 'seller sku', 'merchant sku'],
      asin: ['asin', 'fnsku'],
      idq_score: ['idq score', 'idq', 'inventory score', 'health score'],
      stranded_flag: ['stranded', 'is stranded'],
      excess_flag: ['excess', 'is excess'],
      stranded_units: ['stranded units', 'stranded qty', 'stranded quantity'],
      excess_units: ['excess units', 'excess qty', 'excess quantity'],
      aged_90: ['90 day', '90+', 'aged 90', 'inv age 90'],
      aged_180: ['180 day', '180+', 'aged 180', 'inv age 180'],
      aged_365: ['365 day', '365+', 'aged 365', 'inv age 365', '1 year'],
      storage_fees: ['storage fee', 'estimated fee', 'monthly fee', 'fees'],
      recommended_action: ['recommended action', 'action', 'recommendation'],
      date: ['date', 'snapshot date', 'report date', 'as of date'],
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

  private normalizeAction(action: string): string {
    if (!action) return 'none';
    const lower = action.toLowerCase();

    if (lower.includes('liquidat')) return 'liquidate';
    if (lower.includes('remov')) return 'removal';
    if (lower.includes('price')) return 'price_reduction';
    if (lower.includes('promot')) return 'promotion';

    return 'none';
  }
}
