-- Brand Keywords Table Migration
-- For branded keyword classification in analytics
-- Run this in Supabase SQL Editor

-- =============================================================================
-- BRAND KEYWORDS TABLE
-- =============================================================================

-- Store client-configurable brand terms for keyword classification
CREATE TABLE brand_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, keyword)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_brand_keywords_client ON brand_keywords(client_id);
CREATE INDEX idx_brand_keywords_keyword ON brand_keywords(keyword);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE brand_keywords ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

CREATE POLICY "Users can view org brand_keywords" ON brand_keywords
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org brand_keywords" ON brand_keywords
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update org brand_keywords" ON brand_keywords
    FOR UPDATE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete org brand_keywords" ON brand_keywords
    FOR DELETE USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN profiles p ON p.organization_id = c.organization_id
            WHERE p.id = auth.uid()
        )
    );
