-- Add new status to transfers table
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_usd_approval', 'completed', 'failed'));

-- Update existing USDT transfers to pending_usd_approval if they are pending
UPDATE transfers 
SET status = 'pending_usd_approval'
WHERE destination_currency = 'USDT' 
AND status = 'pending';

-- Create function to handle USDT transfer status changes
CREATE OR REPLACE FUNCTION handle_usdt_transfer_status()
RETURNS trigger AS $$
BEGIN
  -- For new USDT transfers, set initial status
  IF TG_OP = 'INSERT' THEN
    IF NEW.destination_currency = 'USDT' THEN
      NEW.status := 'pending_usd_approval';
    END IF;
    RETURN NEW;
  END IF;

  -- For updates, validate status transitions
  IF TG_OP = 'UPDATE' THEN
    -- Skip validation for non-USDT transfers
    IF NEW.destination_currency != 'USDT' THEN
      RETURN NEW;
    END IF;

    -- Allow same status
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    -- Validate transitions
    CASE OLD.status
      WHEN 'pending_usd_approval' THEN
        IF NEW.status IN ('pending', 'failed') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers in pending_usd_approval can only transition to pending or failed';

      WHEN 'pending' THEN
        IF NEW.status IN ('completed', 'failed') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'USDT transfers in pending can only transition to completed or failed';

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
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
CREATE TRIGGER handle_usdt_transfer_status_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_usdt_transfer_status();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_destination_currency ON transfers(destination_currency);

-- Add comment explaining the USDT transfer flow
COMMENT ON TABLE transfers IS E'USDT transfers follow this flow:\n1. pending_usd_approval (initial state)\n2. pending (after admin approval)\n3. completed (after deposit confirmation)\n\nNote: failed state can be set from pending_usd_approval or pending states';