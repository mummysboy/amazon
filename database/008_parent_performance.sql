-- Parent Performance Table Migration
-- For "Detail Page Sales and Traffic By Parent Item.csv"
-- Run this in Supabase SQL Editor

-- =============================================================================
-- PARENT PERFORMANCE TABLE
-- =============================================================================

CREATE TABLE parent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    parent_asin TEXT NOT NULL,
    title TEXT,
    sessions INTEGER DEFAULT 0,
    sessions_b2b INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    page_views_b2b INTEGER DEFAULT 0,
    buy_box_percentage DECIMAL(5, 2) DEFAULT 0,
    buy_box_percentage_b2b DECIMAL(5, 2) DEFAULT 0,
    units_ordered INTEGER DEFAULT 0,
    units_ordered_b2b INTEGER DEFAULT 0,
    unit_session_percentage DECIMAL(5, 2) DEFAULT 0,
    unit_session_percentage_b2b DECIMAL(5, 2) DEFAULT 0,
    ordered_product_sales DECIMAL(12, 2) DEFAULT 0,
    ordered_product_sales_b2b DECIMAL(12, 2) DEFAULT 0,
    total_order_items INTEGER DEFAULT 0,
    total_order_items_b2b INTEGER DEFAULT 0,
    data_source_type TEXT NOT NULL DEFAULT 'manual_upload',
    data_source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, parent_asin)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_parent_perf_client ON parent_performance(client_id);
CREATE INDEX idx_parent_perf_asin ON parent_performance(client_id, parent_asin);
CREATE INDEX idx_parent_perf_source ON parent_performance(data_source_id);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE parent_performance ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

CREATE POLICY "Users can view org parent_performance" ON parent_performance
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org parent_performance" ON parent_performance
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update org parent_performance" ON parent_performance
    FOR UPDATE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete org parent_performance" ON parent_performance
    FOR DELETE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGER FOR updated_at
-- =============================================================================

CREATE TRIGGER set_updated_at_parent_performance
    BEFORE UPDATE ON parent_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
