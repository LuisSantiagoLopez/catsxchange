-- Drop existing constraint and trigger
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
DROP FUNCTION IF EXISTS handle_usdt_transfer_status();

-- Add status constraint
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_usd_approval', 'completed', 'failed'));

-- Create simplified status handler
CREATE OR REPLACE FUNCTION handle_usdt_transfer_status()
RETURNS trigger AS $$
BEGIN
  -- For new transfers
  IF TG_OP = 'INSERT' THEN
    IF NEW.destination_currency = 'USDT' THEN
      NEW.status := 'pending_usd_approval';
    END IF;
    RETURN NEW;
  END IF;

  -- For updates
  IF TG_OP = 'UPDATE' THEN
    -- Skip validation for non-USDT transfers
    IF NEW.destination_currency != 'USDT' THEN
      RETURN NEW;
    END IF;

    -- Allow same status
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    -- Allow transition to failed from any state
    IF NEW.status = 'failed' THEN
      RETURN NEW;
    END IF;

    -- Handle valid transitions
    IF OLD.status = 'pending_usd_approval' AND NEW.status = 'completed' THEN
      RETURN NEW;
    END IF;

    IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
      RETURN NEW;
    END IF;

    -- If we get here, it's an invalid transition
    RAISE EXCEPTION 'Invalid status transition for USDT transfer';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER handle_usdt_transfer_status_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_usdt_transfer_status();

-- Add index
CREATE INDEX IF NOT EXISTS idx_transfers_status_currency ON transfers(status, destination_currency);

-- Add documentation
COMMENT ON TABLE transfers IS E'USDT transfers follow this flow:\n1. pending_usd_approval (initial state)\n2. completed (after approval)\n\nNote: failed state can be set from any state';