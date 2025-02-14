-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
DROP FUNCTION IF EXISTS handle_usdt_transfer_status();

-- Create simplified function to handle USDT transfer status changes
CREATE OR REPLACE FUNCTION handle_usdt_transfer_status()
RETURNS trigger AS $$
BEGIN
  -- For non-USDT transfers, allow any status change
  IF NEW.destination_currency != 'USDT' THEN
    RETURN NEW;
  END IF;

  -- For new USDT transfers, set initial status
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending_usd_approval';
    RETURN NEW;
  END IF;

  -- For updates, validate status transitions
  IF TG_OP = 'UPDATE' THEN
    -- Allow same status
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    -- Validate transitions
    CASE OLD.status
      -- From pending_usd_approval can go to pending or failed
      WHEN 'pending_usd_approval' THEN
        IF NEW.status IN ('pending', 'failed') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers must be approved before proceeding';

      -- From pending can go to completed or failed
      WHEN 'pending' THEN
        IF NEW.status IN ('completed', 'failed') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers must be confirmed after approval';

      -- Final states cannot be changed
      WHEN 'completed' THEN
        RAISE EXCEPTION 'Cannot change status of completed USDT transfer';
      WHEN 'failed' THEN
        RAISE EXCEPTION 'Cannot change status of failed USDT transfer';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for USDT transfer status changes
CREATE TRIGGER handle_usdt_transfer_status_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_usdt_transfer_status();

-- Add comment explaining the USDT transfer flow
COMMENT ON TABLE transfers IS E'USDT transfers follow this flow:\n1. pending_usd_approval (initial state)\n2. pending (after admin approval)\n3. completed (after deposit confirmation)\n\nNote: failed state can be set from pending_usd_approval or pending states';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfers_status_currency ON transfers(status, destination_currency);