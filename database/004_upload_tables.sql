-- Upload data tables for Amazon reports
-- Run this in Supabase SQL Editor

-- Daily Sales & Traffic (from "Detail Page Sales and Traffic.csv")
CREATE TABLE daily_sales_traffic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ordered_product_sales DECIMAL(12, 2) DEFAULT 0,
    units_ordered INTEGER DEFAULT 0,
    total_order_items INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    buy_box_percentage DECIMAL(5, 2) DEFAULT 0,
    unit_session_percentage DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, date)
);

-- Product Performance (from "Detail Page Sales and Traffic By Child Item.csv")
CREATE TABLE product_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    parent_asin TEXT,
    child_asin TEXT NOT NULL,
    title TEXT,
    sessions INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    buy_box_percentage DECIMAL(5, 2) DEFAULT 0,
    units_ordered INTEGER DEFAULT 0,
    unit_session_percentage DECIMAL(5, 2) DEFAULT 0,
    ordered_product_sales DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, child_asin)
);

-- Search Term Performance (from "US_Search_Query_Performance...csv")
CREATE TABLE search_term_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    search_term TEXT NOT NULL,
    search_query_score INTEGER DEFAULT 0,
    search_query_volume INTEGER DEFAULT 0,
    impressions_total INTEGER DEFAULT 0,
    impressions_brand INTEGER DEFAULT 0,
    impressions_brand_share DECIMAL(10, 4) DEFAULT 0,
    clicks_total INTEGER DEFAULT 0,
    clicks_brand INTEGER DEFAULT 0,
    clicks_brand_share DECIMAL(10, 4) DEFAULT 0,
    purchases_total INTEGER DEFAULT 0,
    purchases_brand INTEGER DEFAULT 0,
    purchases_brand_share DECIMAL(10, 4) DEFAULT 0,
    reporting_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, search_term, reporting_date)
);

-- Inventory Snapshots (from "Amazon-fulfilled+Inventory...txt")
CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    asin TEXT NOT NULL,
    condition TEXT,
    warehouse_condition TEXT,
    quantity_available INTEGER DEFAULT 0,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, asin, snapshot_date)
);

-- Indexes for performance
CREATE INDEX idx_daily_sales_client_date ON daily_sales_traffic(client_id, date);
CREATE INDEX idx_product_perf_client ON product_performance(client_id);
CREATE INDEX idx_search_term_client_date ON search_term_performance(client_id, reporting_date);
CREATE INDEX idx_inventory_client_date ON inventory_snapshots(client_id, snapshot_date);

-- Enable RLS
ALTER TABLE daily_sales_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_term_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can see data for clients in their organization)
CREATE POLICY "Users can view org daily_sales" ON daily_sales_traffic
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org daily_sales" ON daily_sales_traffic
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can view org product_performance" ON product_performance
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org product_performance" ON product_performance
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can view org search_term_performance" ON search_term_performance
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org search_term_performance" ON search_term_performance
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can view org inventory_snapshots" ON inventory_snapshots
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org inventory_snapshots" ON inventory_snapshots
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );
