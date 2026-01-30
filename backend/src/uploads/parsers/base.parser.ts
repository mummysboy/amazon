/**
 * Base parser class for all report CSV/TSV parsers
 * Provides common utilities for parsing, cleaning, and validating data
 */
export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  metadata: ParseMetadata;
}

export interface ParseError {
  row: number;
  field?: string;
  message: string;
  rawValue?: string;
}

export interface ParseMetadata {
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

export abstract class BaseParser<T> {
  protected errors: ParseError[] = [];

  /**
   * Parse the file content and return structured data
   */
  abstract parse(content: string): ParseResult<T>;

  /**
   * Get the report type identifier
   */
  abstract getReportType(): string;

  /**
   * Get the target database table name
   */
  abstract getTableName(): string;

  /**
   * Clean string - remove quotes and trim whitespace
   */
  protected cleanString(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Parse CSV line handling quoted values with commas inside
   */
  protected parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Parse TSV line (tab-separated)
   */
  protected parseTSVLine(line: string): string[] {
    return line.split('\t').map((val) => this.cleanString(val));
  }

  /**
   * Parse date from MM/DD/YY or MM/DD/YYYY format to YYYY-MM-DD
   */
  protected parseDate(dateStr: string): string {
    if (!dateStr) return '';
    const cleaned = this.cleanString(dateStr);

    // Try MM/DD/YY or MM/DD/YYYY format
    const slashParts = cleaned.split('/');
    if (slashParts.length === 3) {
      const year =
        slashParts[2].length === 2 ? `20${slashParts[2]}` : slashParts[2];
      return `${year}-${slashParts[0].padStart(2, '0')}-${slashParts[1].padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD format (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }

    return cleaned; // Return as-is if format unknown
  }

  /**
   * Parse currency string like "$1,234.56" to number
   */
  protected parseCurrency(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/[$,]/g, '').trim();
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse percentage string like "12.34%" to number (12.34)
   */
  protected parsePercentage(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace('%', '').trim();
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse integer with fallback to 0
   */
  protected parseInt(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/,/g, '').trim();
    return parseInt(cleaned) || 0;
  }

  /**
   * Parse float with fallback to 0
   */
  protected parseFloat(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/,/g, '').trim();
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse boolean from various string representations
   */
  protected parseBoolean(value: string): boolean {
    if (!value) return false;
    const cleaned = value.toLowerCase().trim();
    return (
      cleaned === 'true' ||
      cleaned === 'yes' ||
      cleaned === '1' ||
      cleaned === 'y'
    );
  }

  /**
   * Add a parsing error
   */
  protected addError(row: number, message: string, field?: string, rawValue?: string): void {
    this.errors.push({ row, field, message, rawValue });
  }

  /**
   * Reset errors for new parse
   */
  protected resetErrors(): void {
    this.errors = [];
  }

  /**
   * Create parse result with metadata
   */
  protected createResult(
    data: T[],
    totalRows: number,
    dateRange?: { start: string; end: string },
  ): ParseResult<T> {
    return {
      data,
      errors: this.errors,
      metadata: {
        totalRows,
        parsedRows: data.length,
        skippedRows: totalRows - data.length,
        dateRange,
      },
    };
  }

  /**
   * Extract date range from parsed data
   */
  protected extractDateRange(
    dates: string[],
  ): { start: string; end: string } | undefined {
    const validDates = dates.filter((d) => d && d.length > 0).sort();
    if (validDates.length === 0) return undefined;
    return {
      start: validDates[0],
      end: validDates[validDates.length - 1],
    };
  }
}
