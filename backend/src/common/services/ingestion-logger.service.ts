import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type DataSourceType =
  | 'manual_upload'
  | 'sp_api'
  | 'advertising_api'
  | 'keepa_api';

export interface UploadSessionCreate {
  organizationId: string;
  clientId: string;
  userId: string;
  reportType: string;
  fileName?: string;
  fileSizeBytes?: number;
}

export interface UploadSessionUpdate {
  status: 'processing' | 'completed' | 'failed';
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errorMessage?: string;
}

export interface IngestionLogEntry {
  organizationId: string;
  clientId: string;
  sourceType: DataSourceType;
  sourceId?: string;
  tableName: string;
  operation: 'insert' | 'update' | 'upsert';
  recordCount: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class IngestionLoggerService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }

  /**
   * Create a new upload session record
   * Returns the session ID to be used for tracking
   */
  async createUploadSession(params: UploadSessionCreate): Promise<string> {
    const { data, error } = await this.supabase
      .from('upload_sessions')
      .insert({
        organization_id: params.organizationId,
        client_id: params.clientId,
        user_id: params.userId,
        report_type: params.reportType,
        file_name: params.fileName,
        file_size_bytes: params.fileSizeBytes,
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create upload session:', error);
      throw new Error(`Failed to create upload session: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update an upload session with progress or completion status
   */
  async updateUploadSession(
    sessionId: string,
    update: UploadSessionUpdate,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status: update.status,
    };

    if (update.recordsProcessed !== undefined) {
      updateData.records_processed = update.recordsProcessed;
    }
    if (update.recordsInserted !== undefined) {
      updateData.records_inserted = update.recordsInserted;
    }
    if (update.recordsUpdated !== undefined) {
      updateData.records_updated = update.recordsUpdated;
    }
    if (update.recordsSkipped !== undefined) {
      updateData.records_skipped = update.recordsSkipped;
    }
    if (update.errorMessage) {
      updateData.error_message = update.errorMessage;
    }

    if (update.status === 'completed' || update.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('upload_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to update upload session:', error);
    }
  }

  /**
   * Mark session as processing
   */
  async markSessionProcessing(sessionId: string): Promise<void> {
    await this.updateUploadSession(sessionId, { status: 'processing' });
  }

  /**
   * Mark session as completed with stats
   */
  async markSessionCompleted(
    sessionId: string,
    stats: {
      recordsProcessed: number;
      recordsInserted: number;
      recordsUpdated?: number;
      recordsSkipped?: number;
    },
  ): Promise<void> {
    await this.updateUploadSession(sessionId, {
      status: 'completed',
      ...stats,
    });
  }

  /**
   * Mark session as failed with error
   */
  async markSessionFailed(sessionId: string, error: string): Promise<void> {
    await this.updateUploadSession(sessionId, {
      status: 'failed',
      errorMessage: error,
    });
  }

  /**
   * Log a data ingestion event to the audit trail
   */
  async logIngestion(entry: IngestionLogEntry): Promise<void> {
    const { error } = await this.supabase.from('data_ingestion_log').insert({
      organization_id: entry.organizationId,
      client_id: entry.clientId,
      source_type: entry.sourceType,
      source_id: entry.sourceId,
      table_name: entry.tableName,
      operation: entry.operation,
      record_count: entry.recordCount,
      date_range_start: entry.dateRangeStart,
      date_range_end: entry.dateRangeEnd,
      metadata: entry.metadata || {},
    });

    if (error) {
      console.error('Failed to log ingestion:', error);
    }
  }

  /**
   * Get upload history for an organization
   */
  async getUploadHistory(
    organizationId: string,
    options?: {
      clientId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    sessions: Array<{
      id: string;
      clientId: string;
      clientName?: string;
      reportType: string;
      fileName?: string;
      status: string;
      recordsInserted: number;
      createdAt: string;
      completedAt?: string;
    }>;
    total: number;
  }> {
    let query = this.supabase
      .from('upload_sessions')
      .select(
        `
        id,
        client_id,
        report_type,
        file_name,
        status,
        records_inserted,
        created_at,
        completed_at,
        clients!inner(name)
      `,
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.clientId) {
      query = query.eq('client_id', options.clientId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to get upload history:', error);
      throw new Error(`Failed to get upload history: ${error.message}`);
    }

    const sessions = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: (row.clients as Record<string, unknown>)?.name as string,
      reportType: row.report_type as string,
      fileName: row.file_name as string | undefined,
      status: row.status as string,
      recordsInserted: (row.records_inserted as number) || 0,
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | undefined,
    }));

    return {
      sessions,
      total: count || 0,
    };
  }

  /**
   * Get ingestion log for a client
   */
  async getIngestionLog(
    clientId: string,
    options?: {
      limit?: number;
      sourceType?: DataSourceType;
    },
  ): Promise<
    Array<{
      id: string;
      sourceType: string;
      tableName: string;
      operation: string;
      recordCount: number;
      dateRangeStart?: string;
      dateRangeEnd?: string;
      createdAt: string;
    }>
  > {
    let query = this.supabase
      .from('data_ingestion_log')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (options?.sourceType) {
      query = query.eq('source_type', options.sourceType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get ingestion log:', error);
      throw new Error(`Failed to get ingestion log: ${error.message}`);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      sourceType: row.source_type as string,
      tableName: row.table_name as string,
      operation: row.operation as string,
      recordCount: row.record_count as number,
      dateRangeStart: row.date_range_start as string | undefined,
      dateRangeEnd: row.date_range_end as string | undefined,
      createdAt: row.created_at as string,
    }));
  }
}
