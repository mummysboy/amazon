import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private async validateAccess(
    authHeader: string,
    clientId: string,
  ): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new UnauthorizedException('User not assigned to an organization');
    }

    // Verify client belongs to user's organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  // ========================================
  // EXISTING ENDPOINTS
  // ========================================

  @Get('daily-sales/:clientId')
  @ApiOperation({ summary: 'Get daily sales data for a client' })
  async getDailySales(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getDailySales(clientId);
  }

  @Get('products/:clientId')
  @ApiOperation({ summary: 'Get product performance for a client' })
  async getProducts(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getProductPerformance(clientId);
  }

  @Get('search-terms/:clientId')
  @ApiOperation({ summary: 'Get search term data for a client' })
  async getSearchTerms(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getSearchTerms(clientId);
  }

  @Get('inventory/:clientId')
  @ApiOperation({ summary: 'Get inventory data for a client' })
  async getInventory(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getInventory(clientId);
  }

  // ========================================
  // NEW ENDPOINTS
  // ========================================

  @Get('advertising/:clientId')
  @ApiOperation({ summary: 'Get advertising metrics for a client' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filter by campaign ID' })
  @ApiQuery({ name: 'campaignType', required: false, description: 'Filter by type (SP, SB, SD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async getAdvertising(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignId') campaignId?: string,
    @Query('campaignType') campaignType?: string,
    @Query('limit') limit?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getAdvertisingMetrics(clientId, {
      startDate,
      endDate,
      campaignId,
      campaignType,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('advertising-summary/:clientId')
  @ApiOperation({ summary: 'Get advertising summary with campaign totals' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  async getAdvertisingSummary(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getAdvertisingSummary(clientId, {
      startDate,
      endDate,
    });
  }

  @Get('sku-campaigns/:clientId')
  @ApiOperation({ summary: 'Get SKU to campaign mappings for a client' })
  @ApiQuery({ name: 'sku', required: false, description: 'Filter by SKU' })
  @ApiQuery({ name: 'campaignType', required: false, description: 'Filter by type (SP, SB, SD)' })
  async getSkuCampaigns(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('sku') sku?: string,
    @Query('campaignType') campaignType?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getSkuCampaignMapping(clientId, {
      sku,
      campaignType,
    });
  }

  @Get('parent-child/:clientId')
  @ApiOperation({ summary: 'Get parent-child ASIN mappings for a client' })
  @ApiQuery({ name: 'parentAsin', required: false, description: 'Filter by parent ASIN' })
  @ApiQuery({ name: 'childAsin', required: false, description: 'Filter by child ASIN' })
  async getParentChild(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('parentAsin') parentAsin?: string,
    @Query('childAsin') childAsin?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getParentChildMapping(clientId, {
      parentAsin,
      childAsin,
    });
  }

  @Get('restocking/:clientId')
  @ApiOperation({ summary: 'Get FBA restocking limits for a client' })
  @ApiQuery({ name: 'snapshotDate', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'storageType', required: false, description: 'Filter by storage type' })
  async getRestocking(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('snapshotDate') snapshotDate?: string,
    @Query('storageType') storageType?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getRestockingLimits(clientId, {
      snapshotDate,
      storageType,
    });
  }

  @Get('restocking-status/:clientId')
  @ApiOperation({ summary: 'Get latest FBA restocking status' })
  async getRestockingStatus(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getLatestRestockingStatus(clientId);
  }

  @Get('idq/:clientId')
  @ApiOperation({ summary: 'Get IDQ scores for a client' })
  @ApiQuery({ name: 'snapshotDate', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sku', required: false, description: 'Filter by SKU' })
  @ApiQuery({ name: 'hasIssues', required: false, description: 'Filter to only items with issues' })
  async getIdq(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('snapshotDate') snapshotDate?: string,
    @Query('sku') sku?: string,
    @Query('hasIssues') hasIssues?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getIdqScores(clientId, {
      snapshotDate,
      sku,
      hasIssues: hasIssues === 'true',
    });
  }

  @Get('inventory-health/:clientId')
  @ApiOperation({ summary: 'Get inventory health summary' })
  async getInventoryHealth(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getInventoryHealthSummary(clientId);
  }

  @Get('rankings/:clientId')
  @ApiOperation({ summary: 'Get SKU rankings (BSR, pricing) for a client' })
  @ApiQuery({ name: 'snapshotDate', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'asin', required: false, description: 'Filter by ASIN' })
  @ApiQuery({ name: 'maxRank', required: false, description: 'Filter by max category rank' })
  async getRankings(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('snapshotDate') snapshotDate?: string,
    @Query('asin') asin?: string,
    @Query('maxRank') maxRank?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.reportsService.getSkuRankings(clientId, {
      snapshotDate,
      asin,
      maxRank: maxRank ? parseInt(maxRank) : undefined,
    });
  }
}
