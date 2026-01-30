import { BaseParser, ParseResult } from './base.parser';

export interface RestockingLimitsRow {
  storage_type: string;
  utilization_percentage: number;
  max_inventory_units: number;
  current_inventory_units: number;
  available_units: number;
  inbound_units: number;
  reserved_units: number;
  snapshot_date: string;
}

/**
 * Parser for FBA Restocking/Storage Limits reports
 * Tracks FBA storage capacity and utilization
 *
 * Expected columns:
 * Storage Type, Utilization %, Max Units, Current Units, Available Units,
 * Inbound Units, Reserved Units, Date
 */
export class RestockingLimitsParser extends BaseParser<RestockingLimitsRow> {
  private columnMap: Map<string, number> = new Map();

  getReportType(): string {
    return 'restocking_limits';
  }

  getTableName(): string {
    return 'restocking_limits';
  }

  parse(content: string): ParseResult<RestockingLimitsRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: RestockingLimitsRow[] = [];
    const dates: string[] = [];

    // Default snapshot date if not in file
    const defaultDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const storageType = this.normalizeStorageType(
          this.getColumn(values, 'storage_type'),
        );

        if (!storageType) {
          this.addError(rowNum, 'Missing Storage Type', 'storage_type');
          continue;
        }

        const snapshotDate =
          this.parseDate(this.getColumn(values, 'date')) || defaultDate;

        const maxUnits = this.parseInt(this.getColumn(values, 'max_units'));
        const currentUnits = this.parseInt(this.getColumn(values, 'current_units'));

        // Calculate utilization if not provided
        let utilization = this.parsePercentage(
          this.getColumn(values, 'utilization'),
        );
        if (utilization === 0 && maxUnits > 0) {
          utilization = (currentUnits / maxUnits) * 100;
        }

        const row: RestockingLimitsRow = {
          storage_type: storageType,
          utilization_percentage: utilization,
          max_inventory_units: maxUnits,
          current_inventory_units: currentUnits,
          available_units: this.parseInt(this.getColumn(values, 'available_units')),
          inbound_units: this.parseInt(this.getColumn(values, 'inbound_units')),
          reserved_units: this.parseInt(this.getColumn(values, 'reserved_units')),
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
      storage_type: ['storage type', 'type', 'category'],
      utilization: ['utilization', 'utilization %', 'usage %', 'usage'],
      max_units: ['max units', 'maximum units', 'limit', 'max inventory'],
      current_units: ['current units', 'current inventory', 'inventory'],
      available_units: ['available units', 'available', 'remaining'],
      inbound_units: ['inbound units', 'inbound', 'shipping'],
      reserved_units: ['reserved units', 'reserved', 'fc reserved'],
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

  private normalizeStorageType(type: string): string {
    if (!type) return '';
    const lower = type.toLowerCase();

    if (lower.includes('standard')) return 'standard';
    if (lower.includes('oversize')) return 'oversize';
    if (lower.includes('apparel')) return 'apparel';
    if (lower.includes('footwear') || lower.includes('shoe')) return 'footwear';
    if (lower.includes('flammable')) return 'flammable';
    if (lower.includes('aerosol')) return 'aerosol';

    return lower;
  }
}
