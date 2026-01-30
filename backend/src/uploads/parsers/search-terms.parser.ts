import { BaseParser, ParseResult } from './base.parser';

export interface SearchTermRow {
  search_term: string;
  search_query_score: number;
  search_query_volume: number;
  impressions_total: number;
  impressions_brand: number;
  impressions_brand_share: number;
  clicks_total: number;
  clicks_brand: number;
  clicks_brand_share: number;
  purchases_total: number;
  purchases_brand: number;
  purchases_brand_share: number;
  reporting_date: string;
}

/**
 * Parser for "US_Search_Query_Performance*.csv"
 * Search term analytics with brand vs competitor metrics
 */
export class SearchTermsParser extends BaseParser<SearchTermRow> {
  getReportType(): string {
    return 'search_terms';
  }

  getTableName(): string {
    return 'search_term_performance';
  }

  parse(content: string): ParseResult<SearchTermRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    // Skip the first line (filter metadata) and use second line as headers
    const dataLines = lines.slice(2);

    const data: SearchTermRow[] = [];
    const dates: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 3; // Account for 2 skipped lines
      try {
        const values = this.parseCSVLine(dataLines[i]);
        const searchTerm = this.cleanString(values[0]);

        if (!searchTerm || searchTerm.length === 0) {
          this.addError(rowNum, 'Missing search term', 'search_term');
          continue;
        }

        const reportingDate =
          this.cleanString(values[33]) ||
          new Date().toISOString().split('T')[0];

        const row: SearchTermRow = {
          search_term: searchTerm,
          search_query_score: this.parseInt(values[1]),
          search_query_volume: this.parseInt(values[2]),
          impressions_total: this.parseInt(values[3]),
          impressions_brand: this.parseInt(values[4]),
          impressions_brand_share: this.parseFloat(values[5]),
          clicks_total: this.parseInt(values[6]),
          clicks_brand: this.parseInt(values[8]),
          clicks_brand_share: this.parseFloat(values[9]),
          purchases_total: this.parseInt(values[24]),
          purchases_brand: this.parseInt(values[26]),
          purchases_brand_share: this.parseFloat(values[27]),
          reporting_date: reportingDate,
        };

        data.push(row);
        dates.push(reportingDate);
      } catch (err) {
        this.addError(rowNum, `Parse error: ${err.message}`);
      }
    }

    return this.createResult(data, dataLines.length, this.extractDateRange(dates));
  }

  /**
   * Deduplicate by search_term + reporting_date
   */
  deduplicate(data: SearchTermRow[]): SearchTermRow[] {
    const deduped = new Map<string, SearchTermRow>();

    for (const row of data) {
      const key = `${row.search_term}|${row.reporting_date}`;
      if (!deduped.has(key)) {
        deduped.set(key, row);
      }
    }

    return Array.from(deduped.values());
  }
}
