import { BaseParser, ParseResult } from './base.parser';

export interface ParentChildRow {
  parent_asin: string;
  child_asin: string;
  relationship_type: string;
  variation_attributes: Record<string, string>;
  marketplace_id: string;
}

/**
 * Parser for Parent-Child ASIN Mapping files
 * Maps child ASINs to their parent variations
 *
 * Expected columns:
 * Parent ASIN, Child ASIN, Relationship Type, Color, Size, Style, etc.
 */
export class ParentChildParser extends BaseParser<ParentChildRow> {
  private columnMap: Map<string, number> = new Map();
  private variationColumns: { name: string; index: number }[] = [];

  getReportType(): string {
    return 'parent_child';
  }

  getTableName(): string {
    return 'parent_child_mapping';
  }

  parse(content: string): ParseResult<ParentChildRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: ParentChildRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const parentAsin = this.getColumn(values, 'parent_asin');
        const childAsin = this.getColumn(values, 'child_asin');

        if (!parentAsin) {
          this.addError(rowNum, 'Missing Parent ASIN', 'parent_asin');
          continue;
        }

        if (!childAsin) {
          this.addError(rowNum, 'Missing Child ASIN', 'child_asin');
          continue;
        }

        // Extract variation attributes
        const variationAttributes: Record<string, string> = {};
        for (const { name, index } of this.variationColumns) {
          const value = this.cleanString(values[index]);
          if (value) {
            variationAttributes[name] = value;
          }
        }

        const row: ParentChildRow = {
          parent_asin: parentAsin,
          child_asin: childAsin,
          relationship_type: this.getColumn(values, 'relationship_type') || 'variation',
          variation_attributes: variationAttributes,
          marketplace_id: this.getColumn(values, 'marketplace_id') || 'ATVPDKIKX0DER',
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
    this.variationColumns = [];

    const mappings: Record<string, string[]> = {
      parent_asin: ['parent asin', 'parentasin', 'parent'],
      child_asin: ['child asin', 'childasin', 'child', 'asin'],
      relationship_type: ['relationship type', 'relationship', 'type'],
      marketplace_id: ['marketplace id', 'marketplace', 'market'],
    };

    // Known variation attribute column names
    const variationNames = [
      'color',
      'size',
      'style',
      'material',
      'pattern',
      'flavor',
      'scent',
      'model',
      'item package quantity',
      'unit count',
    ];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();

      // Check standard mappings
      for (const [key, variants] of Object.entries(mappings)) {
        if (variants.some((v) => header.includes(v))) {
          if (!this.columnMap.has(key)) {
            this.columnMap.set(key, i);
          }
        }
      }

      // Check for variation attributes
      for (const varName of variationNames) {
        if (header.includes(varName)) {
          this.variationColumns.push({ name: varName, index: i });
          break;
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
}
