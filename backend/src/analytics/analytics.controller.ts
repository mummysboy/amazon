import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
  // Chart 1: Sales Breakdown
  // ========================================

  @Get(':clientId/sales-breakdown')
  @ApiOperation({ summary: 'Get sales breakdown (total, ad spend, ad attributed, organic)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getSalesBreakdown(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getSalesBreakdown(clientId, startDate, endDate);
  }

  // ========================================
  // Chart 2: TACOS Trend
  // ========================================

  @Get(':clientId/tacos-trend')
  @ApiOperation({ summary: 'Get TACOS (Total Advertising Cost of Sales) over time' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getTacosTrend(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getTacosTrend(clientId, startDate, endDate);
  }

  // ========================================
  // Chart 3: Sessions vs Revenue
  // ========================================

  @Get(':clientId/sessions-revenue')
  @ApiOperation({ summary: 'Get sessions vs revenue data (dual-axis)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getSessionsRevenue(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getSessionsRevenue(clientId, startDate, endDate);
  }

  // ========================================
  // Chart 4: Keyword Performance Bubble
  // ========================================

  @Get(':clientId/keyword-performance')
  @ApiOperation({ summary: 'Get keyword performance for bubble chart' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 100)' })
  async getKeywordPerformance(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getKeywordPerformance(
      clientId,
      startDate,
      endDate,
      limit ? parseInt(limit) : 100,
    );
  }

  // ========================================
  // Chart 5: Branded vs Non-Branded Spend
  // ========================================

  @Get(':clientId/branded-spend')
  @ApiOperation({ summary: 'Get branded vs non-branded spend over time' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getBrandedSpend(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getBrandedSpend(clientId, startDate, endDate);
  }

  // ========================================
  // Chart 6: BSR vs Ad Spend
  // ========================================

  @Get(':clientId/bsr-vs-spend')
  @ApiOperation({ summary: 'Get BSR vs ad spend scatter data' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getBsrVsSpend(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getBsrVsSpend(clientId, startDate, endDate);
  }

  // ========================================
  // Chart 7: Top SKU TACOS
  // ========================================

  @Get(':clientId/top-sku-tacos')
  @ApiOperation({ summary: 'Get top SKUs by TACOS with trend data' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 10)' })
  async getTopSkuTacos(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getTopSkuTacos(
      clientId,
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }

  // ========================================
  // Chart 8: Growth Decomposition
  // ========================================

  @Get(':clientId/growth-decomposition')
  @ApiOperation({ summary: 'Get growth decomposition waterfall data' })
  @ApiQuery({ name: 'currentStart', required: true, description: 'Current period start date' })
  @ApiQuery({ name: 'currentEnd', required: true, description: 'Current period end date' })
  @ApiQuery({ name: 'previousStart', required: true, description: 'Previous period start date' })
  @ApiQuery({ name: 'previousEnd', required: true, description: 'Previous period end date' })
  async getGrowthDecomposition(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getGrowthDecomposition(
      clientId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    );
  }

  // ========================================
  // Chart 9: Wasted Spend
  // ========================================

  @Get(':clientId/wasted-spend')
  @ApiOperation({ summary: 'Get wasted spend data (keywords with spend but no orders)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'clickThreshold', required: false, description: 'Minimum clicks to count (default 1)' })
  async getWastedSpend(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('clickThreshold') clickThreshold?: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getWastedSpend(
      clientId,
      startDate,
      endDate,
      clickThreshold ? parseInt(clickThreshold) : 1,
    );
  }

  // ========================================
  // Brand Keywords Management
  // ========================================

  @Get(':clientId/brand-keywords')
  @ApiOperation({ summary: 'Get brand keywords for a client' })
  async getBrandKeywords(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    return this.analyticsService.getBrandKeywords(clientId);
  }

  @Post(':clientId/brand-keywords')
  @ApiOperation({ summary: 'Add a brand keyword' })
  async addBrandKeyword(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Body('keyword') keyword: string,
  ) {
    await this.validateAccess(auth, clientId);
    await this.analyticsService.addBrandKeyword(clientId, keyword);
    return { success: true };
  }

  @Delete(':clientId/brand-keywords/:keyword')
  @ApiOperation({ summary: 'Remove a brand keyword' })
  async removeBrandKeyword(
    @Param('clientId') clientId: string,
    @Param('keyword') keyword: string,
    @Headers('authorization') auth: string,
  ) {
    await this.validateAccess(auth, clientId);
    await this.analyticsService.removeBrandKeyword(clientId, keyword);
    return { success: true };
  }
}
