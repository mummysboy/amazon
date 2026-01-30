import { BaseParser, ParseResult } from './base.parser';

export interface ParentPerformanceRow {
  parent_asin: string;
  title: string;
  sessions: number;
  sessions_b2b: number;
  page_views: number;
  page_views_b2b: number;
  buy_box_percentage: number;
  buy_box_percentage_b2b: number;
  units_ordered: number;
  units_ordered_b2b: number;
  unit_session_percentage: number;
  unit_session_percentage_b2b: number;
  ordered_product_sales: number;
  ordered_product_sales_b2b: number;
  total_order_items: number;
  total_order_items_b2b: number;
}

/**
 * Parser for "Detail Page Sales and Traffic By Parent Item.csv"
 * Parent ASIN-level product performance data
 */
export class ParentPerformanceParser extends BaseParser<ParentPerformanceRow> {
  getReportType(): string {
    return 'parent_performance';
  }

  getTableName(): string {
    return 'parent_performance';
  }

  parse(content: string): ParseResult<ParentPerformanceRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    const data: ParentPerformanceRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);
        const parentAsin = this.cleanString(values[0]);

        // Skip rows without a valid parent ASIN
        if (!parentAsin || parentAsin.length === 0) {
          this.addError(rowNum, 'Missing parent ASIN', 'parent_asin');
          continue;
        }

        const row: ParentPerformanceRow = {
          parent_asin: parentAsin,
          title: (this.cleanString(values[1]) || 'Untitled').substring(0, 500),
          sessions: this.parseInt(values[2]),
          sessions_b2b: this.parseInt(values[3]),
          page_views: this.parseInt(values[6]),
          page_views_b2b: this.parseInt(values[7]),
          buy_box_percentage: this.parsePercentage(values[10]),
          buy_box_percentage_b2b: this.parsePercentage(values[11]),
          units_ordered: this.parseInt(values[12]),
          units_ordered_b2b: this.parseInt(values[13]),
          unit_session_percentage: this.parsePercentage(values[14]),
          unit_session_percentage_b2b: this.parsePercentage(values[15]),
          ordered_product_sales: this.parseCurrency(values[16]),
          ordered_product_sales_b2b: this.parseCurrency(values[17]),
          total_order_items: this.parseInt(values[18]),
          total_order_items_b2b: this.parseInt(values[19]),
        };

        data.push(row);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length);
  }

  /**
   * Deduplicate by parent ASIN, keeping highest sales
   */
  deduplicate(data: ParentPerformanceRow[]): ParentPerformanceRow[] {
    const deduped = new Map<string, ParentPerformanceRow>();

    for (const row of data) {
      const existing = deduped.get(row.parent_asin);
      if (
        !existing ||
        row.ordered_product_sales > existing.ordered_product_sales
      ) {
        deduped.set(row.parent_asin, row);
      }
    }

    return Array.from(deduped.values());
  }
}
