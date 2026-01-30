import { BaseParser, ParseResult } from './base.parser';

export interface SkuRankingRow {
  asin: string;
  sku: string;
  category_rank: number;
  category_name: string;
  subcategory_rank: number;
  subcategory_name: string;
  current_price: number;
  lowest_fba_price: number;
  buybox_price: number;
  buybox_seller: string;
  is_buybox_amazon: boolean;
  review_count: number;
  review_rating: number;
  keepa_drops_30d: number;
  keepa_drops_90d: number;
  keepa_monthly_sales_estimate: number;
  snapshot_date: string;
}

/**
 * Parser for SKU Rankings / Keepa data exports
 * Tracks BSR, pricing, reviews, and sales estimates
 *
 * Expected columns:
 * ASIN, SKU, Category Rank, Category, Subcategory Rank, Subcategory,
 * Price, FBA Price, Buy Box Price, Buy Box Seller, Reviews, Rating,
 * Drops 30d, Drops 90d, Est Monthly Sales, Date
 */
export class SkuRankingsParser extends BaseParser<SkuRankingRow> {
  private columnMap: Map<string, number> = new Map();

  getReportType(): string {
    return 'sku_rankings';
  }

  getTableName(): string {
    return 'sku_rankings';
  }

  parse(content: string): ParseResult<SkuRankingRow> {
    this.resetErrors();

    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return this.createResult([], 0);
    }

    // Parse header to build column map
    const headers = this.parseCSVLine(lines[0]);
    this.buildColumnMap(headers);

    const dataLines = lines.slice(1);
    const data: SkuRankingRow[] = [];
    const dates: string[] = [];

    // Default snapshot date if not in file
    const defaultDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      try {
        const values = this.parseCSVLine(dataLines[i]);

        const asin = this.getColumn(values, 'asin');
        if (!asin) {
          this.addError(rowNum, 'Missing ASIN', 'asin');
          continue;
        }

        const snapshotDate =
          this.parseDate(this.getColumn(values, 'date')) || defaultDate;

        const buyboxSeller = this.getColumn(values, 'buybox_seller');
        const isAmazon = this.detectAmazonBuybox(buyboxSeller);

        const row: SkuRankingRow = {
          asin,
          sku: this.getColumn(values, 'sku'),
          category_rank: this.parseInt(this.getColumn(values, 'category_rank')),
          category_name: this.getColumn(values, 'category_name'),
          subcategory_rank: this.parseInt(this.getColumn(values, 'subcategory_rank')),
          subcategory_name: this.getColumn(values, 'subcategory_name'),
          current_price: this.parseCurrency(this.getColumn(values, 'price')),
          lowest_fba_price: this.parseCurrency(this.getColumn(values, 'fba_price')),
          buybox_price: this.parseCurrency(this.getColumn(values, 'buybox_price')),
          buybox_seller: buyboxSeller,
          is_buybox_amazon: isAmazon,
          review_count: this.parseInt(this.getColumn(values, 'reviews')),
          review_rating: this.parseFloat(this.getColumn(values, 'rating')),
          keepa_drops_30d: this.parseInt(this.getColumn(values, 'drops_30d')),
          keepa_drops_90d: this.parseInt(this.getColumn(values, 'drops_90d')),
          keepa_monthly_sales_estimate: this.parseInt(
            this.getColumn(values, 'monthly_sales'),
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
      asin: ['asin'],
      sku: ['sku', 'seller sku'],
      category_rank: ['category rank', 'bsr', 'sales rank', 'rank'],
      category_name: ['category', 'category name', 'root category'],
      subcategory_rank: ['subcategory rank', 'sub rank', 'subcat rank'],
      subcategory_name: ['subcategory', 'subcategory name', 'sub category'],
      price: ['price', 'current price', 'list price'],
      fba_price: ['fba price', 'lowest fba', 'fba lowest'],
      buybox_price: ['buy box price', 'buybox price', 'bb price'],
      buybox_seller: ['buy box seller', 'buybox seller', 'bb seller', 'buybox winner'],
      reviews: ['reviews', 'review count', 'number of reviews', 'ratings count'],
      rating: ['rating', 'avg rating', 'average rating', 'star rating'],
      drops_30d: ['drops 30', '30 day drops', '30d drops', 'sales drops 30'],
      drops_90d: ['drops 90', '90 day drops', '90d drops', 'sales drops 90'],
      monthly_sales: [
        'monthly sales',
        'est monthly',
        'estimated sales',
        'sales estimate',
        'est sales',
      ],
      date: ['date', 'snapshot date', 'last update', 'data date'],
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

  private detectAmazonBuybox(seller: string): boolean {
    if (!seller) return false;
    const lower = seller.toLowerCase();
    return (
      lower.includes('amazon') ||
      lower === 'amzn' ||
      lower.includes('amazon.com')
    );
  }
}
