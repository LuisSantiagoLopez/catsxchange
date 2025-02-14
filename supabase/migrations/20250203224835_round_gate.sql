-- Create table for exchange rate history
CREATE TABLE exchange_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair text NOT NULL,
  provider_rate numeric NOT NULL,
  our_rate numeric NOT NULL,
  profit_margin numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_currency_pair CHECK (currency_pair IN ('USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES'))
);

-- Create table for transfer statistics
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
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for exchange rate history
CREATE POLICY "exchange_rate_history_select_policy"
  ON exchange_rate_history FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "exchange_rate_history_insert_policy"
  ON exchange_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for transfer statistics
CREATE POLICY "transfer_statistics_select_policy"
  ON transfer_statistics FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "transfer_statistics_insert_policy"
  ON transfer_statistics FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

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

-- Create triggers
CREATE TRIGGER track_exchange_rate_changes
  AFTER UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION track_exchange_rate_changes();

CREATE TRIGGER track_transfer_statistics
  AFTER INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION track_transfer_statistics();

-- Add indexes for better performance
CREATE INDEX idx_exchange_rate_history_currency_pair 
  ON exchange_rate_history(currency_pair);
CREATE INDEX idx_exchange_rate_history_created_at 
  ON exchange_rate_history(created_at);

CREATE INDEX idx_transfer_statistics_user_id 
  ON transfer_statistics(user_id);
CREATE INDEX idx_transfer_statistics_created_at 
  ON transfer_statistics(created_at);

-- Add comments
COMMENT ON TABLE exchange_rate_history IS 'Historical record of exchange rate changes';
COMMENT ON TABLE transfer_statistics IS 'Statistics for completed transfers including profit calculations';