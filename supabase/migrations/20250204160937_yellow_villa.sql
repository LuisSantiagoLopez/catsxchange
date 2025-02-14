-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
DROP FUNCTION IF EXISTS handle_usdt_transfer_status();

-- Create improved function to handle USDT transfer validation and status
CREATE OR REPLACE FUNCTION handle_usdt_transfer_status()
RETURNS trigger AS $$
BEGIN
  -- For USDT transfers, verify permissions
  IF NEW.destination_currency = 'USDT' THEN
    -- Check if user has approved USDT permission
    IF NOT EXISTS (
      SELECT 1 FROM saved_accounts
      WHERE user_id = NEW.user_id
      AND type = 'binance'
      AND usdt_enabled = true
      AND verified_at IS NOT NULL
      AND id = (NEW.destination_details->>'account_id')::uuid
    ) THEN
      RAISE EXCEPTION 'No tienes permiso para realizar envíos en USD. Por favor, solicita acceso primero.';
    END IF;

    -- Set initial status for new USDT transfers
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending_usd_approval';
    END IF;
  END IF;

  -- For updates, validate status transitions
  IF TG_OP = 'UPDATE' AND NEW.destination_currency = 'USDT' THEN
    -- Allow same status
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    -- Allow transition to failed from any state
    IF NEW.status = 'failed' THEN
      RETURN NEW;
    END IF;

    -- Handle valid transitions
    CASE OLD.status
      WHEN 'pending_usd_approval' THEN
        IF NEW.status = 'pending' THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers in pending_usd_approval state can only move to pending or failed';
        
      WHEN 'pending' THEN
        IF NEW.status = 'completed' THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers in pending state can only move to completed or failed';
        
      WHEN 'completed' THEN
        RAISE EXCEPTION 'Cannot modify a completed transfer';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for USDT transfer validation
CREATE TRIGGER handle_usdt_transfer_status_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_usdt_transfer_status();

-- Add comment explaining the validation
COMMENT ON FUNCTION handle_usdt_transfer_status() IS 'Validates USDT transfers and manages status transitions';