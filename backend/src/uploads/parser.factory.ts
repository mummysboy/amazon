import { BaseParser } from './parsers/base.parser';
import { DailySalesParser, DailySalesRow } from './parsers/daily-sales.parser';
import {
  ProductPerformanceParser,
  ProductPerformanceRow,
} from './parsers/product-performance.parser';
import {
  ParentPerformanceParser,
  ParentPerformanceRow,
} from './parsers/parent-performance.parser';
import {
  SearchTermsParser,
  SearchTermRow,
} from './parsers/search-terms.parser';
import { InventoryParser, InventoryRow } from './parsers/inventory.parser';
import {
  AdvertisingReportParser,
  AdvertisingReportRow,
} from './parsers/advertising-report.parser';
import {
  AdvertisingBulkParser,
  AdvertisingBulkRow,
} from './parsers/advertising-bulk.parser';
import {
  SkuCampaignMappingParser,
  SkuCampaignMappingRow,
} from './parsers/sku-campaign-mapping.parser';
import {
  ParentChildParser,
  ParentChildRow,
} from './parsers/parent-child.parser';
import {
  RestockingLimitsParser,
  RestockingLimitsRow,
} from './parsers/restocking-limits.parser';
import { IdqScoresParser, IdqScoreRow } from './parsers/idq-scores.parser';
import { SkuRankingsParser, SkuRankingRow } from './parsers/sku-rankings.parser';

export type ReportType =
  | 'daily_sales'
  | 'product_performance'
  | 'parent_performance'
  | 'search_terms'
  | 'inventory'
  | 'advertising_report'
  | 'advertising_bulk'
  | 'sku_campaign_mapping'
  | 'parent_child'
  | 'restocking_limits'
  | 'idq_scores'
  | 'sku_rankings';

export type ParsedRowType =
  | DailySalesRow
  | ProductPerformanceRow
  | ParentPerformanceRow
  | SearchTermRow
  | InventoryRow
  | AdvertisingReportRow
  | AdvertisingBulkRow
  | SkuCampaignMappingRow
  | ParentChildRow
  | RestockingLimitsRow
  | IdqScoreRow
  | SkuRankingRow;

export interface ReportTypeInfo {
  type: ReportType;
  label: string;
  description: string;
  fileHint: string;
  tableName: string;
}

export const REPORT_TYPE_INFO: Record<ReportType, ReportTypeInfo> = {
  daily_sales: {
    type: 'daily_sales',
    label: 'Daily Sales & Traffic',
    description: 'Daily aggregate sales, sessions, page views',
    fileHint: 'Detail Page Sales and Traffic.csv',
    tableName: 'daily_sales_traffic',
  },
  product_performance: {
    type: 'product_performance',
    label: 'Product Performance (Child)',
    description: 'Child ASIN-level sales and conversion data',
    fileHint: 'Detail Page Sales and Traffic By Child Item.csv',
    tableName: 'product_performance',
  },
  parent_performance: {
    type: 'parent_performance',
    label: 'Product Performance (Parent)',
    description: 'Parent ASIN-level sales and conversion data',
    fileHint: 'Detail Page Sales and Traffic By Parent Item.csv',
    tableName: 'parent_performance',
  },
  search_terms: {
    type: 'search_terms',
    label: 'Search Query Performance',
    description: 'Search term impressions, clicks, purchases',
    fileHint: 'US_Search_Query_Performance*.csv',
    tableName: 'search_term_performance',
  },
  inventory: {
    type: 'inventory',
    label: 'Inventory',
    description: 'Current FBA inventory levels',
    fileHint: 'Amazon-fulfilled+Inventory*.txt',
    tableName: 'inventory_snapshots',
  },
  advertising_report: {
    type: 'advertising_report',
    label: 'Advertising Reports (CSV)',
    description: 'Campaign, ad group, and keyword performance metrics',
    fileHint: 'Sponsored Products/Brands/Display CSV reports',
    tableName: 'advertising_report_metrics',
  },
  advertising_bulk: {
    type: 'advertising_bulk',
    label: 'Advertising Bulk File (Excel)',
    description: 'Amazon Advertising bulk operations Excel file with all campaign types',
    fileHint: 'bulk-*.xlsx from Amazon Advertising console',
    tableName: 'advertising_report_metrics',
  },
  sku_campaign_mapping: {
    type: 'sku_campaign_mapping',
    label: 'SKU Campaign Mapping',
    description: 'Map SKUs to advertising campaigns',
    fileHint: 'Custom mapping file with SKU, Campaign ID columns',
    tableName: 'sku_campaign_mapping',
  },
  parent_child: {
    type: 'parent_child',
    label: 'Parent-Child Mapping',
    description: 'ASIN variation relationships',
    fileHint: 'Catalog export or custom mapping file',
    tableName: 'parent_child_mapping',
  },
  restocking_limits: {
    type: 'restocking_limits',
    label: 'Restocking Limits',
    description: 'FBA storage limits and utilization',
    fileHint: 'FBA Inventory Age/Restocking report',
    tableName: 'restocking_limits',
  },
  idq_scores: {
    type: 'idq_scores',
    label: 'IDQ Scores',
    description: 'Inventory quality and stranded/excess inventory',
    fileHint: 'FBA Inventory Health or custom export',
    tableName: 'idq_scores',
  },
  sku_rankings: {
    type: 'sku_rankings',
    label: 'SKU Rankings',
    description: 'BSR, pricing, and Keepa data',
    fileHint: 'Keepa export or custom rankings file',
    tableName: 'sku_rankings',
  },
};

export class ParserFactory {
  private static parsers: Map<ReportType, BaseParser<ParsedRowType>> =
    new Map();

  static getParser(reportType: ReportType): BaseParser<ParsedRowType> {
    // Return cached parser or create new one
    if (this.parsers.has(reportType)) {
      return this.parsers.get(reportType)!;
    }

    let parser: BaseParser<ParsedRowType>;

    switch (reportType) {
      case 'daily_sales':
        parser = new DailySalesParser();
        break;
      case 'product_performance':
        parser = new ProductPerformanceParser();
        break;
      case 'parent_performance':
        parser = new ParentPerformanceParser();
        break;
      case 'search_terms':
        parser = new SearchTermsParser();
        break;
      case 'inventory':
        parser = new InventoryParser();
        break;
      case 'advertising_report':
        parser = new AdvertisingReportParser();
        break;
      case 'advertising_bulk':
        parser = new AdvertisingBulkParser();
        break;
      case 'sku_campaign_mapping':
        parser = new SkuCampaignMappingParser();
        break;
      case 'parent_child':
        parser = new ParentChildParser();
        break;
      case 'restocking_limits':
        parser = new RestockingLimitsParser();
        break;
      case 'idq_scores':
        parser = new IdqScoresParser();
        break;
      case 'sku_rankings':
        parser = new SkuRankingsParser();
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    this.parsers.set(reportType, parser);
    return parser;
  }

  static getReportTypeInfo(reportType: ReportType): ReportTypeInfo {
    return REPORT_TYPE_INFO[reportType];
  }

  static getAllReportTypes(): ReportTypeInfo[] {
    return Object.values(REPORT_TYPE_INFO);
  }

  static isValidReportType(type: string): type is ReportType {
    return type in REPORT_TYPE_INFO;
  }
}
