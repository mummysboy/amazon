import { BaseParser, ParseResult } from './base.parser';

export interface DailySalesRow {
  date: string;
  ordered_product_sales: number;
  units_ordered: number;
  total_order_items: number;
  page_views: number;
  sessions: number;
  buy_box_percentage: number;
  unit_session_percentage: number;
}

/**
 * Parser for "Detail Page Sales and Traffic.csv"
 * Daily aggregate sales and traffic metrics
 */
export class DailySalesParser extends BaseParser<DailySalesRow> {
  getReportType(): string {
    return 'daily_sales';
  }

  getTableName(): string {
    return 'daily_sales_traffic';
  }

  parse(content: string): ParseResult<DailySalesRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    const data: DailySalesRow[] = [];
    const dates: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2; // 1-indexed, accounting for header
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const date = this.parseDate(values[0]);
        if (!date) {
          this.addError(rowNum, 'Invalid or missing date', 'date', values[0]);
          continue;
        }

        const row: DailySalesRow = {
          date,
          ordered_product_sales: this.parseCurrency(values[1]),
          units_ordered: this.parseInt(values[3]),
          total_order_items: this.parseInt(values[5]),
          page_views: this.parseInt(values[7]),
          sessions: this.parseInt(values[9]),
          buy_box_percentage: this.parsePercentage(values[11]),
          unit_session_percentage: this.parsePercentage(values[13]),
        };

        data.push(row);
        dates.push(date);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length, this.extractDateRange(dates));
  }
}
