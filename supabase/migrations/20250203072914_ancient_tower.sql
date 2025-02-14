/*
  # Exchange Rates Table

  1. New Tables
    - `exchange_rates`
      - `id` (uuid, primary key)
      - `currency_pair` (text)
      - `provider_rate` (numeric)
      - `our_rate` (numeric)
      - `profit_margin` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `exchange_rates` table
    - Add policies for admin access
*/

-- Create exchange_rates table
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair text NOT NULL,
  provider_rate numeric NOT NULL,
  our_rate numeric NOT NULL,
  profit_margin numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_currency_pair CHECK (currency_pair IN ('USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES')),
  CONSTRAINT positive_rates CHECK (provider_rate > 0 AND our_rate > 0)
);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow admin read exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_exchange_rates_currency_pair ON exchange_rates(currency_pair);
CREATE INDEX idx_exchange_rates_created_at ON exchange_rates(created_at);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_exchange_rates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_exchange_rates_updated_at();

-- Add comment
COMMENT ON TABLE exchange_rates IS 'Table to store exchange rates and profit margins';