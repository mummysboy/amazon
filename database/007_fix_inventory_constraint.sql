-- Fix inventory_snapshots unique constraint to handle multiple warehouse conditions
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE inventory_snapshots DROP CONSTRAINT IF EXISTS inventory_snapshots_client_id_asin_snapshot_date_key;

-- Add new constraint that includes sku and warehouse_condition
ALTER TABLE inventory_snapshots ADD CONSTRAINT inventory_snapshots_unique_key
    UNIQUE(client_id, sku, warehouse_condition, snapshot_date);

-- Add index for the new constraint pattern
CREATE INDEX IF NOT EXISTS idx_inventory_sku_condition ON inventory_snapshots(client_id, sku, warehouse_condition);
