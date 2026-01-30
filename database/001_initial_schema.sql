-- Amazon Management Platform - Initial Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xuhgeijtznelymlwzwic/sql

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations (agencies/networks using the platform)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (Amazon sellers/brands being managed)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AMAZON ACCOUNT CONNECTIONS
-- ============================================

-- Amazon Advertising accounts (connected via OAuth)
CREATE TABLE amazon_advertising_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL, -- Amazon Advertising profile ID
    marketplace TEXT NOT NULL, -- US, CA, UK, DE, etc.
    account_name TEXT,
    account_type TEXT CHECK (account_type IN ('seller', 'vendor', 'agency')),
    access_token TEXT, -- Encrypted in production
    refresh_token TEXT, -- Encrypted in production
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, profile_id)
);

-- Amazon Selling Partner accounts (SP-API)
CREATE TABLE amazon_sp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    seller_id TEXT NOT NULL, -- Amazon Seller/Vendor ID
    marketplace TEXT NOT NULL,
    account_name TEXT,
    account_type TEXT CHECK (account_type IN ('seller', 'vendor')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, seller_id, marketplace)
);

-- ============================================
-- ADVERTISING DATA
-- ============================================

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amazon_account_id UUID NOT NULL REFERENCES amazon_advertising_accounts(id) ON DELETE CASCADE,
    amazon_campaign_id TEXT NOT NULL, -- Amazon's campaign ID
    name TEXT NOT NULL,
    campaign_type TEXT CHECK (campaign_type IN ('sponsoredProducts', 'sponsoredBrands', 'sponsoredDisplay')),
    targeting_type TEXT CHECK (targeting_type IN ('manual', 'auto')),
    status TEXT CHECK (status IN ('enabled', 'paused', 'archived')),
    daily_budget DECIMAL(12, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(amazon_account_id, amazon_campaign_id)
);

-- Ad Groups
CREATE TABLE ad_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    amazon_ad_group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('enabled', 'paused', 'archived')),
    default_bid DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, amazon_ad_group_id)
);

-- Keywords
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    amazon_keyword_id TEXT NOT NULL,
    keyword_text TEXT NOT NULL,
    match_type TEXT CHECK (match_type IN ('exact', 'phrase', 'broad')),
    status TEXT CHECK (status IN ('enabled', 'paused', 'archived')),
    bid DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ad_group_id, amazon_keyword_id)
);

-- Negative Keywords
CREATE TABLE negative_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
    amazon_negative_keyword_id TEXT NOT NULL,
    keyword_text TEXT NOT NULL,
    match_type TEXT CHECK (match_type IN ('negativeExact', 'negativePhrase')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (campaign_id IS NOT NULL OR ad_group_id IS NOT NULL)
);

-- Product Ads
CREATE TABLE product_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    amazon_ad_id TEXT NOT NULL,
    asin TEXT NOT NULL,
    sku TEXT,
    status TEXT CHECK (status IN ('enabled', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ad_group_id, amazon_ad_id)
);

-- ============================================
-- PERFORMANCE METRICS (Daily Snapshots)
-- ============================================

-- Campaign daily metrics
CREATE TABLE campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0,
    sales DECIMAL(12, 2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- Keyword daily metrics
CREATE TABLE keyword_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0,
    sales DECIMAL(12, 2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword_id, date)
);

-- Search terms (from search term reports)
CREATE TABLE search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    search_term TEXT NOT NULL,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0,
    sales DECIMAL(12, 2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTOMATION & RULES
-- ============================================

-- Automation rules
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- NULL = applies to all clients
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL, -- 'bid_adjustment', 'pause_keyword', 'budget_alert', etc.
    conditions JSONB NOT NULL, -- Flexible condition structure
    actions JSONB NOT NULL, -- Actions to take when conditions met
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule execution history
CREATE TABLE rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('success', 'failed', 'skipped')),
    affected_items INTEGER DEFAULT 0,
    details JSONB,
    error_message TEXT
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_campaigns_amazon_account ON campaigns(amazon_account_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_keyword_metrics_date ON keyword_metrics(keyword_id, date);
CREATE INDEX idx_search_terms_campaign_date ON search_terms(campaign_id, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_advertising_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can see organizations they belong to
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Users can see clients in their organization
CREATE POLICY "Users can view organization clients" ON clients
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert organization clients" ON clients
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update organization clients" ON clients
    FOR UPDATE USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete organization clients" ON clients
    FOR DELETE USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Uncomment to create a test organization
-- INSERT INTO organizations (name, slug) VALUES ('My Agency', 'my-agency');
