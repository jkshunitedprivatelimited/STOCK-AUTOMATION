-- ============================================
-- Stock Request Orders Table
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS stock_request_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL DEFAULT '',
  user_phone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'packed', 'dispatched', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_stock_request_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_request_orders_updated_at
  BEFORE UPDATE ON stock_request_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_request_orders_updated_at();

-- Enable RLS
ALTER TABLE stock_request_orders ENABLE ROW LEVEL SECURITY;

-- Franchise users can read their own orders
CREATE POLICY "Users can view their own request orders"
  ON stock_request_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Franchise users can insert their own orders
CREATE POLICY "Users can create request orders"
  ON stock_request_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Franchise users can update their own orders (for cancellation)
CREATE POLICY "Users can update their own request orders"
  ON stock_request_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Central/admin users can view all orders (role = 'central' in profiles)
CREATE POLICY "Central can view all request orders"
  ON stock_request_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
    )
  );

-- Central/admin users can update all orders (status changes)
CREATE POLICY "Central can update all request orders"
  ON stock_request_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE stock_request_orders;

-- Index for performance
CREATE INDEX idx_stock_request_orders_user_id ON stock_request_orders(user_id);
CREATE INDEX idx_stock_request_orders_franchise_id ON stock_request_orders(franchise_id);
CREATE INDEX idx_stock_request_orders_status ON stock_request_orders(status);
CREATE INDEX idx_stock_request_orders_created_at ON stock_request_orders(created_at DESC);
