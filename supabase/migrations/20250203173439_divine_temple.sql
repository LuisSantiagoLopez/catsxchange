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
  -- If it's a USDT transfer being created, set initial status to pending_usd_approval
  IF NEW.destination_currency = 'USDT' AND TG_OP = 'INSERT' THEN
    NEW.status := 'pending_usd_approval';
  END IF;

  -- Only allow status changes in the correct order for USDT transfers
  IF NEW.destination_currency = 'USDT' AND TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending_usd_approval' AND NEW.status NOT IN ('pending', 'failed') THEN
      RAISE EXCEPTION 'USDT transfers must be approved before completion';
    END IF;
    
    IF OLD.status = 'pending' AND NEW.status NOT IN ('completed', 'failed') THEN
      RAISE EXCEPTION 'USDT transfers must be confirmed after approval';
    END IF;
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

-- Add comment explaining the USDT transfer flow
COMMENT ON TABLE transfers IS 'USDT transfers follow the flow: pending_usd_approval -> pending -> completed';