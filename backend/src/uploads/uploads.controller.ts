import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { UploadsService } from './uploads.service';
import { ParserFactory, ReportType, REPORT_TYPE_INFO } from './parser.factory';

interface UploadDto {
  clientId: string;
  reportType: ReportType;
  content: string; // Base64 or raw CSV content
  fileName?: string;
}

interface AuthContext {
  userId: string;
  organizationId: string;
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('api/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  private async validateAuth(authHeader: string): Promise<AuthContext> {
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

    return {
      userId: user.id,
      organizationId: profile.organization_id,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Upload CSV data for a client' })
  async upload(
    @Body() dto: UploadDto,
    @Headers('authorization') auth: string,
  ) {
    const { userId, organizationId } = await this.validateAuth(auth);

    // Validate report type
    if (!ParserFactory.isValidReportType(dto.reportType)) {
      throw new BadRequestException(
        `Invalid report type: ${dto.reportType}. Valid types: ${Object.keys(REPORT_TYPE_INFO).join(', ')}`,
      );
    }

    // Verify client belongs to organization
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', dto.clientId)
      .eq('organization_id', organizationId)
      .single();

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // Handle content based on type
    let content = dto.content;
    let fileSizeBytes = content.length;

    // Check if it's a binary file (Excel) - don't decode, pass base64 directly to parser
    const isBinaryFile = dto.fileName?.match(/\.(xlsx|xls)$/i);

    if (dto.content.includes('base64,')) {
      const base64Data = dto.content.split('base64,')[1];
      fileSizeBytes = Buffer.from(base64Data, 'base64').length;

      if (isBinaryFile) {
        // For binary files, keep the full data URL - parser will handle it
        console.log('Binary file detected, keeping base64 encoding');
      } else {
        // For text files (CSV, TSV), decode to UTF-8
        content = Buffer.from(base64Data, 'base64').toString('utf-8');
      }
    }

    // Remove BOM if present (only for text content)
    if (!isBinaryFile) {
      content = content.replace(/^\uFEFF/, '');
    }

    console.log('=== UPLOAD REQUEST ===');
    console.log('Report type:', dto.reportType);
    console.log('Client ID:', dto.clientId);
    console.log('Content length:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));

    try {
      const result = await this.uploadsService.processUpload({
        clientId: dto.clientId,
        organizationId,
        userId,
        reportType: dto.reportType,
        content,
        fileName: dto.fileName,
        fileSizeBytes,
      });

      return result;
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      throw new BadRequestException(`Failed to process upload: ${error.message}`);
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get upload history' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getHistory(
    @Headers('authorization') auth: string,
    @Query('clientId') clientId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { organizationId } = await this.validateAuth(auth);

    // If clientId provided, verify it belongs to organization
    if (clientId) {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
      );

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (!client) {
        throw new BadRequestException('Client not found');
      }
    }

    return this.uploadsService.getUploadHistory(organizationId, {
      clientId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('report-types')
  @ApiOperation({ summary: 'Get available report types' })
  async getReportTypes() {
    return ParserFactory.getAllReportTypes();
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Delete an upload session and its data' })
  async deleteUpload(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') auth: string,
  ) {
    const { organizationId } = await this.validateAuth(auth);

    // Verify session belongs to organization
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: session, error } = await supabase
      .from('upload_sessions')
      .select('id, report_type, organization_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      throw new NotFoundException('Upload session not found');
    }

    if (session.organization_id !== organizationId) {
      throw new UnauthorizedException('Access denied');
    }

    return this.uploadsService.deleteUpload(sessionId, session.report_type);
  }
}
