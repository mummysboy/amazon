import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Helper to get user's organization from JWT
  private async getOrganizationId(authHeader: string): Promise<string> {
    console.log('Auth header received:', authHeader ? 'Yes' : 'No');

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid auth header format');
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Verify the token and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log('Token validation error:', error.message);
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }

    if (!user) {
      console.log('No user returned from token');
      throw new UnauthorizedException('Invalid token: no user');
    }

    console.log('User validated:', user.id, user.email);

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('Profile fetch error:', profileError.message);
    }

    if (!profile?.organization_id) {
      console.log('No organization_id for user');
      throw new UnauthorizedException('User not assigned to an organization');
    }

    console.log('Organization ID:', profile.organization_id);
    return profile.organization_id;
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients for the organization' })
  async findAll(@Headers('authorization') auth: string) {
    const organizationId = await this.getOrganizationId(auth);
    return this.clientsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific client' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
  ) {
    const organizationId = await this.getOrganizationId(auth);
    return this.clientsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  async create(
    @Body() dto: CreateClientDto,
    @Headers('authorization') auth: string,
  ) {
    const organizationId = await this.getOrganizationId(auth);
    return this.clientsService.create(organizationId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a client' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Headers('authorization') auth: string,
  ) {
    const organizationId = await this.getOrganizationId(auth);
    return this.clientsService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client' })
  async remove(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
  ) {
    const organizationId = await this.getOrganizationId(auth);
    return this.clientsService.remove(id, organizationId);
  }
}
