-- Drop existing tables if they exist
DROP TABLE IF EXISTS exchange_rate_history CASCADE;
DROP TABLE IF EXISTS transfer_statistics CASCADE;
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

-- Create exchange_rate_history table
CREATE TABLE exchange_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair text NOT NULL,
  provider_rate numeric NOT NULL,
  our_rate numeric NOT NULL,
  profit_margin numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_currency_pair CHECK (currency_pair IN ('USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES'))
);

-- Create transfer_statistics table
CREATE TABLE transfer_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES transfers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  origin_currency text NOT NULL,
  destination_currency text NOT NULL,
  amount numeric NOT NULL,
  converted_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  profit numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for exchange_rates
CREATE POLICY "exchange_rates_select"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "exchange_rates_modify"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for exchange_rate_history
CREATE POLICY "exchange_rate_history_select"
  ON exchange_rate_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "exchange_rate_history_insert"
  ON exchange_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for transfer_statistics
CREATE POLICY "transfer_statistics_select"
  ON transfer_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "transfer_statistics_insert"
  ON transfer_statistics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to track exchange rate changes
CREATE OR REPLACE FUNCTION track_exchange_rate_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.provider_rate != OLD.provider_rate OR 
        NEW.our_rate != OLD.our_rate OR 
        NEW.profit_margin != OLD.profit_margin) THEN
      INSERT INTO exchange_rate_history (
        currency_pair,
        provider_rate,
        our_rate,
        profit_margin
      ) VALUES (
        NEW.currency_pair,
        NEW.provider_rate,
        NEW.our_rate,
        NEW.profit_margin
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track transfer statistics
CREATE OR REPLACE FUNCTION track_transfer_statistics()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'completed') THEN
    INSERT INTO transfer_statistics (
      transfer_id,
      user_id,
      origin_currency,
      destination_currency,
      amount,
      converted_amount,
      exchange_rate,
      profit
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.origin_currency,
      NEW.destination_currency,
      NEW.amount,
      NEW.destination_amount,
      NEW.exchange_rate,
      CASE 
        WHEN NEW.destination_currency = 'USDT' THEN
          NEW.destination_amount * (SELECT profit_margin FROM exchange_rates WHERE currency_pair = 'USDT/' || NEW.origin_currency)
        ELSE
          NEW.destination_amount * (SELECT profit_margin FROM exchange_rates WHERE currency_pair = NEW.origin_currency || '/' || NEW.destination_currency)
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_exchange_rates_updated_at ON exchange_rates;
DROP TRIGGER IF EXISTS track_exchange_rate_changes ON exchange_rates;
DROP TRIGGER IF EXISTS track_transfer_statistics ON transfers;

-- Create triggers
CREATE TRIGGER set_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER track_exchange_rate_changes
  AFTER UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION track_exchange_rate_changes();

CREATE TRIGGER track_transfer_statistics
  AFTER INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION track_transfer_statistics();

-- Add indexes
CREATE INDEX idx_exchange_rates_currency_pair ON exchange_rates(currency_pair);
CREATE INDEX idx_exchange_rates_updated_at ON exchange_rates(updated_at);

CREATE INDEX idx_exchange_rate_history_currency_pair ON exchange_rate_history(currency_pair);
CREATE INDEX idx_exchange_rate_history_created_at ON exchange_rate_history(created_at);

CREATE INDEX idx_transfer_statistics_user_id ON transfer_statistics(user_id);
CREATE INDEX idx_transfer_statistics_created_at ON transfer_statistics(created_at);

-- Add comments
COMMENT ON TABLE exchange_rates IS 'Exchange rates for currency pairs with profit margins';
COMMENT ON TABLE exchange_rate_history IS 'Historical record of exchange rate changes';
COMMENT ON TABLE transfer_statistics IS 'Statistics for completed transfers including profit calculations';