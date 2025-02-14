-- First disable all triggers to avoid conflicts
ALTER TABLE transfers DISABLE TRIGGER ALL;

-- Update existing transfers to pending state
UPDATE transfers 
SET status = 'pending'
WHERE status = 'pending_usd_approval';

-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
DROP FUNCTION IF EXISTS handle_usdt_transfer_status();
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;

-- Add new constraint without pending_usd_approval state
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_cardless', 'completed', 'failed'));

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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for USDT validation
CREATE TRIGGER validate_usdt_transfer_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION validate_usdt_transfer();

-- Re-enable triggers
ALTER TABLE transfers ENABLE TRIGGER ALL;

-- Add comment explaining the simplified flow
COMMENT ON FUNCTION validate_usdt_transfer() IS 'Validates that USDT transfers only use verified Binance accounts';