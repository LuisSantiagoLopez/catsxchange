-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS validate_usdt_transfer_trigger ON transfers;
DROP FUNCTION IF EXISTS validate_usdt_transfer();

-- Create simplified function to validate USDT transfers
CREATE OR REPLACE FUNCTION validate_usdt_transfer()
RETURNS trigger AS $$
BEGIN
  -- Only validate USDT transfers
  IF NEW.destination_currency = 'USDT' THEN
    -- Verify Binance account is verified
    IF NOT EXISTS (
      SELECT 1 FROM saved_accounts
      WHERE id = (NEW.destination_details->>'account_id')::uuid
      AND user_id = NEW.user_id
      AND type = 'binance'
      AND usdt_enabled = true
      AND verified_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Para enviar USDT necesitas una cuenta Binance verificada';
    END IF;

    -- Set status to pending for new USDT transfers
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for USDT validation
CREATE TRIGGER validate_usdt_transfer_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION validate_usdt_transfer();

-- Update existing transfers safely
UPDATE transfers 
SET status = 'pending'
WHERE status = 'pending_usd_approval'
AND destination_currency = 'USDT';

-- Update constraint without disabling triggers
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_cardless', 'completed', 'failed'));