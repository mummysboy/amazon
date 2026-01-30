import { BaseParser, ParseResult } from './base.parser';

export interface ProductPerformanceRow {
  parent_asin: string;
  child_asin: string;
  title: string;
  sessions: number;
  page_views: number;
  buy_box_percentage: number;
  units_ordered: number;
  unit_session_percentage: number;
  ordered_product_sales: number;
}

/**
 * Parser for "Detail Page Sales and Traffic By Child Item.csv"
 * ASIN-level product performance data
 */
export class ProductPerformanceParser extends BaseParser<ProductPerformanceRow> {
  getReportType(): string {
    return 'product_performance';
  }

  getTableName(): string {
    return 'product_performance';
  }

  parse(content: string): ParseResult<ProductPerformanceRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    const data: ProductPerformanceRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);
        const childAsin = this.cleanString(values[1]);

        // Skip rows without a valid child ASIN
        if (!childAsin || childAsin.length === 0) {
          this.addError(rowNum, 'Missing child ASIN', 'child_asin');
          continue;
        }

        const row: ProductPerformanceRow = {
          parent_asin: this.cleanString(values[0]) || childAsin, // Fallback to child if parent empty
          child_asin: childAsin,
          title: (this.cleanString(values[2]) || 'Untitled').substring(0, 500), // Limit title length
          sessions: this.parseInt(values[3]),
          page_views: this.parseInt(values[7]),
          buy_box_percentage: this.parsePercentage(values[11]),
          units_ordered: this.parseInt(values[13]),
          unit_session_percentage: this.parsePercentage(values[15]),
          ordered_product_sales: this.parseCurrency(values[17]),
        };

        data.push(row);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length);
  }

  /**
   * Deduplicate products by child ASIN, keeping highest sales
   */
  deduplicate(data: ProductPerformanceRow[]): ProductPerformanceRow[] {
    const deduped = new Map<string, ProductPerformanceRow>();

    for (const row of data) {
      const existing = deduped.get(row.child_asin);
      if (
        !existing ||
        row.ordered_product_sales > existing.ordered_product_sales
      ) {
        deduped.set(row.child_asin, row);
      }
    }

    return Array.from(deduped.values());
  }
}
