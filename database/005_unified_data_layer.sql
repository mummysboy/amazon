-- Unified Data Layer Migration
-- Adds infrastructure for tracking data sources (uploads vs API syncs)
-- and new report types for advertising, parent-child, restocking, IDQ, rankings
-- Run this in Supabase SQL Editor

-- =============================================================================
-- HELPER FUNCTION FOR updated_at TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATA SOURCE TRACKING TABLES
-- =============================================================================

-- Track manual upload sessions
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL,
    file_name TEXT,
    file_size_bytes INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track API sync jobs (for future API integrations)
CREATE TABLE sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    api_source TEXT NOT NULL, -- sp_api, advertising_api, keepa_api
    report_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    api_request_id TEXT, -- For debugging API issues
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified audit trail for all data ingestion
CREATE TABLE data_ingestion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- manual_upload, sp_api, advertising_api, keepa_api
    source_id UUID, -- References upload_sessions.id or sync_jobs.id
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- insert, update, upsert
    record_count INTEGER NOT NULL DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NEW REPORT DATA TABLES
-- =============================================================================

-- Parent-Child ASIN Mapping (from SP-API Catalog or upload)
CREATE TABLE parent_child_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    parent_asin TEXT NOT NULL,
    child_asin TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'variation', -- variation, bundle, etc.
    variation_attributes JSONB DEFAULT '{}', -- {color: "Red", size: "Large"}
    marketplace_id TEXT DEFAULT 'ATVPDKIKX0DER', -- US marketplace
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, parent_asin, child_asin)
);

-- SKU to Campaign Mapping
CREATE TABLE sku_campaign_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    asin TEXT,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    ad_group_id TEXT,
    ad_group_name TEXT,
    campaign_type TEXT, -- SP, SB, SD
    targeting_type TEXT, -- auto, manual, keyword, product
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, sku, campaign_id)
);

-- Restocking Limits (FBA Inventory Limits)
CREATE TABLE restocking_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    storage_type TEXT NOT NULL, -- standard, oversize, apparel, footwear
    utilization_percentage DECIMAL(5, 2) DEFAULT 0,
    max_inventory_units INTEGER DEFAULT 0,
    current_inventory_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    inbound_units INTEGER DEFAULT 0,
    reserved_units INTEGER DEFAULT 0,
    snapshot_date DATE NOT NULL,
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, storage_type, snapshot_date)
);

-- IDQ (Inventory Quality) Scores
CREATE TABLE idq_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    asin TEXT,
    idq_score INTEGER DEFAULT 0, -- 0-1000
    stranded_inventory_flag BOOLEAN DEFAULT FALSE,
    excess_inventory_flag BOOLEAN DEFAULT FALSE,
    aged_inventory_flag BOOLEAN DEFAULT FALSE,
    stranded_units INTEGER DEFAULT 0,
    excess_units INTEGER DEFAULT 0,
    aged_90_day_units INTEGER DEFAULT 0,
    aged_180_day_units INTEGER DEFAULT 0,
    aged_365_day_units INTEGER DEFAULT 0,
    estimated_storage_fees DECIMAL(10, 2) DEFAULT 0,
    recommended_action TEXT, -- liquidate, removal, price_reduction, none
    snapshot_date DATE NOT NULL,
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, sku, snapshot_date)
);

-- SKU Rankings (BSR, Price, Keepa data)
CREATE TABLE sku_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    asin TEXT NOT NULL,
    sku TEXT,
    category_rank INTEGER, -- Best Seller Rank in main category
    category_name TEXT,
    subcategory_rank INTEGER,
    subcategory_name TEXT,
    current_price DECIMAL(10, 2),
    lowest_fba_price DECIMAL(10, 2),
    buybox_price DECIMAL(10, 2),
    buybox_seller TEXT,
    is_buybox_amazon BOOLEAN DEFAULT FALSE,
    review_count INTEGER DEFAULT 0,
    review_rating DECIMAL(3, 2) DEFAULT 0, -- e.g., 4.50
    keepa_drops_30d INTEGER DEFAULT 0, -- Sales rank drops in 30 days
    keepa_drops_90d INTEGER DEFAULT 0,
    keepa_monthly_sales_estimate INTEGER,
    snapshot_date DATE NOT NULL,
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, asin, snapshot_date)
);

-- Advertising Report Metrics (Campaign/AdGroup/Keyword level)
CREATE TABLE advertising_report_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    campaign_type TEXT, -- SP, SB, SD
    campaign_status TEXT,
    ad_group_id TEXT NOT NULL DEFAULT '', -- Empty string for campaign-level metrics
    ad_group_name TEXT,
    keyword_id TEXT NOT NULL DEFAULT '', -- Empty string for ad-group-level metrics
    keyword_text TEXT,
    match_type TEXT, -- broad, phrase, exact
    targeting_type TEXT,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    sales DECIMAL(10, 2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units INTEGER DEFAULT 0,
    acos DECIMAL(8, 4) DEFAULT 0, -- Stored as decimal, e.g., 0.2534 for 25.34%
    roas DECIMAL(8, 4) DEFAULT 0,
    ctr DECIMAL(8, 6) DEFAULT 0,
    cpc DECIMAL(8, 4) DEFAULT 0,
    conversion_rate DECIMAL(8, 6) DEFAULT 0,
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, report_date, campaign_id, ad_group_id, keyword_id)
);

-- =============================================================================
-- ADD DATA SOURCE COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add data source tracking to daily_sales_traffic
ALTER TABLE daily_sales_traffic
ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'manual_upload',
ADD COLUMN IF NOT EXISTS data_source_id UUID;

-- Add data source tracking to product_performance
ALTER TABLE product_performance
ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'manual_upload',
ADD COLUMN IF NOT EXISTS data_source_id UUID;

-- Add data source tracking to search_term_performance
ALTER TABLE search_term_performance
ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'manual_upload',
ADD COLUMN IF NOT EXISTS data_source_id UUID;

-- Add data source tracking to inventory_snapshots
ALTER TABLE inventory_snapshots
ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'manual_upload',
ADD COLUMN IF NOT EXISTS data_source_id UUID;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Upload sessions
CREATE INDEX idx_upload_sessions_org ON upload_sessions(organization_id);
CREATE INDEX idx_upload_sessions_client ON upload_sessions(client_id);
CREATE INDEX idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX idx_upload_sessions_created ON upload_sessions(created_at DESC);

-- Sync jobs
CREATE INDEX idx_sync_jobs_org ON sync_jobs(organization_id);
CREATE INDEX idx_sync_jobs_client ON sync_jobs(client_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);

-- Ingestion log
CREATE INDEX idx_ingestion_log_org ON data_ingestion_log(organization_id);
CREATE INDEX idx_ingestion_log_client ON data_ingestion_log(client_id);
CREATE INDEX idx_ingestion_log_source ON data_ingestion_log(source_type, source_id);
CREATE INDEX idx_ingestion_log_created ON data_ingestion_log(created_at DESC);

-- Parent-child mapping
CREATE INDEX idx_parent_child_client ON parent_child_mapping(client_id);
CREATE INDEX idx_parent_child_parent ON parent_child_mapping(client_id, parent_asin);
CREATE INDEX idx_parent_child_child ON parent_child_mapping(client_id, child_asin);

-- SKU campaign mapping
CREATE INDEX idx_sku_campaign_client ON sku_campaign_mapping(client_id);
CREATE INDEX idx_sku_campaign_sku ON sku_campaign_mapping(client_id, sku);
CREATE INDEX idx_sku_campaign_campaign ON sku_campaign_mapping(client_id, campaign_id);

-- Restocking limits
CREATE INDEX idx_restocking_client_date ON restocking_limits(client_id, snapshot_date);

-- IDQ scores
CREATE INDEX idx_idq_client_date ON idq_scores(client_id, snapshot_date);
CREATE INDEX idx_idq_sku ON idq_scores(client_id, sku);

-- SKU rankings
CREATE INDEX idx_rankings_client_date ON sku_rankings(client_id, snapshot_date);
CREATE INDEX idx_rankings_asin ON sku_rankings(client_id, asin);

-- Advertising metrics
CREATE INDEX idx_advertising_client_date ON advertising_report_metrics(client_id, report_date);
CREATE INDEX idx_advertising_campaign ON advertising_report_metrics(client_id, campaign_id);

-- Data source tracking on existing tables
CREATE INDEX idx_daily_sales_source ON daily_sales_traffic(data_source_type);
CREATE INDEX idx_product_perf_source ON product_performance(data_source_type);
CREATE INDEX idx_search_term_source ON search_term_performance(data_source_type);
CREATE INDEX idx_inventory_source ON inventory_snapshots(data_source_type);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_campaign_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE restocking_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE idq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertising_report_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - Upload Sessions
-- =============================================================================

CREATE POLICY "Users can view own org upload_sessions" ON upload_sessions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own org upload_sessions" ON upload_sessions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update own org upload_sessions" ON upload_sessions
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - Sync Jobs
-- =============================================================================

CREATE POLICY "Users can view own org sync_jobs" ON sync_jobs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own org sync_jobs" ON sync_jobs
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update own org sync_jobs" ON sync_jobs
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - Ingestion Log
-- =============================================================================

CREATE POLICY "Users can view own org data_ingestion_log" ON data_ingestion_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own org data_ingestion_log" ON data_ingestion_log
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - Parent Child Mapping
-- =============================================================================

CREATE POLICY "Users can view org parent_child_mapping" ON parent_child_mapping
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org parent_child_mapping" ON parent_child_mapping
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update org parent_child_mapping" ON parent_child_mapping
    FOR UPDATE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - SKU Campaign Mapping
-- =============================================================================

CREATE POLICY "Users can view org sku_campaign_mapping" ON sku_campaign_mapping
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org sku_campaign_mapping" ON sku_campaign_mapping
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update org sku_campaign_mapping" ON sku_campaign_mapping
    FOR UPDATE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - Restocking Limits
-- =============================================================================

CREATE POLICY "Users can view org restocking_limits" ON restocking_limits
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org restocking_limits" ON restocking_limits
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - IDQ Scores
-- =============================================================================

CREATE POLICY "Users can view org idq_scores" ON idq_scores
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org idq_scores" ON idq_scores
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - SKU Rankings
-- =============================================================================

CREATE POLICY "Users can view org sku_rankings" ON sku_rankings
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org sku_rankings" ON sku_rankings
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - Advertising Report Metrics
-- =============================================================================

CREATE POLICY "Users can view org advertising_report_metrics" ON advertising_report_metrics
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org advertising_report_metrics" ON advertising_report_metrics
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

CREATE TRIGGER set_updated_at_parent_child_mapping
    BEFORE UPDATE ON parent_child_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_sku_campaign_mapping
    BEFORE UPDATE ON sku_campaign_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPFUL VIEWS
-- =============================================================================

-- View: Recent upload history with summary
CREATE OR REPLACE VIEW upload_history_view AS
SELECT
    us.id,
    us.organization_id,
    us.client_id,
    c.name as client_name,
    us.user_id,
    p.full_name as user_name,
    us.report_type,
    us.file_name,
    us.file_size_bytes,
    us.status,
    us.records_processed,
    us.records_inserted,
    us.records_updated,
    us.records_skipped,
    us.error_message,
    us.started_at,
    us.completed_at,
    us.created_at,
    EXTRACT(EPOCH FROM (us.completed_at - us.started_at)) as duration_seconds
FROM upload_sessions us
LEFT JOIN clients c ON us.client_id = c.id
LEFT JOIN profiles p ON us.user_id = p.id
ORDER BY us.created_at DESC;

-- View: Data source summary per client
CREATE OR REPLACE VIEW client_data_sources_view AS
SELECT
    client_id,
    table_name,
    source_type,
    COUNT(*) as ingestion_count,
    SUM(record_count) as total_records,
    MIN(date_range_start) as earliest_data,
    MAX(date_range_end) as latest_data,
    MAX(created_at) as last_ingestion
FROM data_ingestion_log
GROUP BY client_id, table_name, source_type
ORDER BY client_id, table_name;
