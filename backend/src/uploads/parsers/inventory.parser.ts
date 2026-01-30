import { BaseParser, ParseResult } from './base.parser';

export interface InventoryRow {
  sku: string;
  asin: string;
  condition: string;
  warehouse_condition: string;
  quantity_available: number;
}

/**
 * Parser for "Amazon-fulfilled+Inventory*.txt"
 * Tab-separated FBA inventory data
 */
export class InventoryParser extends BaseParser<InventoryRow> {
  getReportType(): string {
    return 'inventory';
  }

  getTableName(): string {
    return 'inventory_snapshots';
  }

  parse(content: string): ParseResult<InventoryRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    const data: InventoryRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseTSVLine(dataLines[i]);
        const asin = this.cleanString(values[2]);

        if (!asin || asin.length === 0) {
          this.addError(rowNum, 'Missing ASIN', 'asin');
          continue;
        }

        const row: InventoryRow = {
          sku: this.cleanString(values[0]),
          asin,
          condition: this.cleanString(values[3]),
          warehouse_condition: this.cleanString(values[4]),
          quantity_available: this.parseInt(values[5]),
        };

        data.push(row);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length);
  }
}
