-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS check_expired_cardless_withdrawals ON cardless_withdrawals;
DROP FUNCTION IF EXISTS check_expired_cardless_withdrawals();
DROP TRIGGER IF EXISTS set_cardless_withdrawal_updated_at ON cardless_withdrawals;
DROP FUNCTION IF EXISTS update_cardless_withdrawal_updated_at();

-- Add function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_cardless_withdrawal_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_cardless_withdrawal_updated_at'
  ) THEN
    CREATE TRIGGER set_cardless_withdrawal_updated_at
      BEFORE UPDATE ON cardless_withdrawals
      FOR EACH ROW
      EXECUTE FUNCTION update_cardless_withdrawal_updated_at();
  END IF;
END $$;

-- Add function to check and update expired codes if it doesn't exist
CREATE OR REPLACE FUNCTION check_expired_cardless_withdrawals()
RETURNS trigger AS $$
BEGIN
  UPDATE cardless_withdrawals
  SET status = 'expired'
  WHERE expires_at < now()
  AND status = 'active';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check expired codes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_expired_cardless_withdrawals'
  ) THEN
    CREATE TRIGGER check_expired_cardless_withdrawals
      AFTER INSERT OR UPDATE ON cardless_withdrawals
      FOR EACH STATEMENT
      EXECUTE FUNCTION check_expired_cardless_withdrawals();
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own cardless withdrawals" ON cardless_withdrawals;
DROP POLICY IF EXISTS "Only admins can create cardless withdrawals" ON cardless_withdrawals;

-- Create or update policies
CREATE POLICY "Users can read own cardless withdrawals"
  ON cardless_withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers
      WHERE transfers.id = cardless_withdrawals.transfer_id
      AND (
        transfers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Only admins can create cardless withdrawals"
  ON cardless_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_cardless_withdrawals_transfer_id'
  ) THEN
    CREATE INDEX idx_cardless_withdrawals_transfer_id ON cardless_withdrawals(transfer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_cardless_withdrawals_status'
  ) THEN
    CREATE INDEX idx_cardless_withdrawals_status ON cardless_withdrawals(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_cardless_withdrawals_expires_at'
  ) THEN
    CREATE INDEX idx_cardless_withdrawals_expires_at ON cardless_withdrawals(expires_at);
  END IF;
END $$;

-- Update transfers table constraints
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_usd_approval', 'pending_cardless', 'completed', 'failed'));

-- Add transfer type constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'transfers' 
    AND constraint_name = 'valid_transfer_type'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT valid_transfer_type
      CHECK (type IN ('usd', 'other', 'cardless'));
  END IF;
END $$;

-- Add destination currency constraint for cardless if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'transfers' 
    AND constraint_name = 'valid_cardless_currency'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT valid_cardless_currency
      CHECK (
        type != 'cardless' 
        OR (
          destination_currency IN ('MXN', 'PEN')
          AND origin_currency IN ('MXN', 'PEN', 'COP', 'VES', 'USDT')
        )
      );
  END IF;
END $$;