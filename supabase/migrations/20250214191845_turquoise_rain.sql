-- Create admin_accounts table
CREATE TABLE admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  account_type text NOT NULL,
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_account_type CHECK (account_type IN ('binance', 'bank')),
  CONSTRAINT valid_currency CHECK (currency IN ('MXN', 'PEN', 'COP', 'VES', 'USDT')),
  CONSTRAINT valid_details CHECK (
    CASE
      WHEN account_type = 'binance' THEN
        (account_details->>'binance_id') IS NOT NULL AND
        (account_details->>'binance_email') IS NOT NULL
      WHEN account_type = 'bank' THEN
        (account_details->>'bank_name') IS NOT NULL AND
        (account_details->>'account_number') IS NOT NULL AND
        (account_details->>'account_holder') IS NOT NULL
      ELSE false
    END
  )
);

-- Enable RLS
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "admin_accounts_select"
  ON admin_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_accounts_modify"
  ON admin_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX idx_admin_accounts_currency ON admin_accounts(currency);
CREATE INDEX idx_admin_accounts_active ON admin_accounts(is_active) WHERE is_active = true;

-- Add comment
COMMENT ON TABLE admin_accounts IS 'Admin accounts for receiving user transfers based on currency';

-- Add function to update updated_at
CREATE OR REPLACE FUNCTION update_admin_account_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_admin_account_timestamp
  BEFORE UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_account_timestamp();