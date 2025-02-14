-- Drop existing table if it exists
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- Create exchange_rates table
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair text NOT NULL,
  provider_rate numeric NOT NULL DEFAULT 1,
  our_rate numeric NOT NULL DEFAULT 1,
  profit_margin numeric NOT NULL DEFAULT 0.02,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_currency_pair CHECK (currency_pair IN ('USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES')),
  CONSTRAINT positive_rates CHECK (provider_rate > 0 AND our_rate > 0 AND profit_margin >= 0)
);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "exchange_rates_select_policy"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "exchange_rates_insert_policy"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "exchange_rates_update_policy"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "exchange_rates_delete_policy"
  ON exchange_rates FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Add indexes
CREATE INDEX idx_exchange_rates_currency_pair ON exchange_rates(currency_pair);
CREATE INDEX idx_exchange_rates_updated_at ON exchange_rates(updated_at);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add comment
COMMENT ON TABLE exchange_rates IS 'Exchange rates for currency pairs with profit margins';