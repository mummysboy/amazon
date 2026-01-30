import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }

  async findAll(organizationId: string) {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Client not found');
    }
    return data;
  }

  async create(organizationId: string, dto: CreateClientDto) {
    const { data, error } = await this.supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        email: dto.email,
        notes: dto.notes,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: UpdateClientDto) {
    const { data, error } = await this.supabase
      .from('clients')
      .update({
        name: dto.name,
        email: dto.email,
        notes: dto.notes,
        status: dto.status,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { success: true };
  }
}
