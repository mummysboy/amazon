import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { AiService } from './ai.service';
import { AiAnalysisRequestDto, AiAnalysisResponse } from './dto/ai-analysis.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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

  @Post(':clientId/analyze')
  @ApiOperation({ summary: 'Get AI-powered analysis of advertising performance' })
  async analyzePerformance(
    @Param('clientId') clientId: string,
    @Headers('authorization') auth: string,
    @Body() dto: AiAnalysisRequestDto,
  ): Promise<AiAnalysisResponse> {
    await this.validateAccess(auth, clientId);

    try {
      return await this.aiService.analyzePerformance(
        clientId,
        dto.periodA,
        dto.periodB,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException(
        'Failed to analyze performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
