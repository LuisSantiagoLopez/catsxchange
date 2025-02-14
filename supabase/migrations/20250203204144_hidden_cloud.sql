-- Update transfers table with new status and type
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

-- Drop and recreate cardless_withdrawals table if it exists
DROP TABLE IF EXISTS cardless_withdrawals CASCADE;

-- Create cardless_withdrawals table
CREATE TABLE cardless_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired'))
);

-- Enable RLS
ALTER TABLE cardless_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Add function to update updated_at
CREATE OR REPLACE FUNCTION update_cardless_withdrawal_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_cardless_withdrawal_updated_at
  BEFORE UPDATE ON cardless_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_cardless_withdrawal_updated_at();

-- Add function to check and update expired codes
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

-- Create trigger to check expired codes
CREATE TRIGGER check_expired_cardless_withdrawals
  AFTER INSERT OR UPDATE ON cardless_withdrawals
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_expired_cardless_withdrawals();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cardless_withdrawals_transfer_id ON cardless_withdrawals(transfer_id);
CREATE INDEX IF NOT EXISTS idx_cardless_withdrawals_status ON cardless_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_cardless_withdrawals_expires_at ON cardless_withdrawals(expires_at);