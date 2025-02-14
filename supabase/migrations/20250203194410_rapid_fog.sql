-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_usdt_transfer_status_trigger ON transfers;
DROP FUNCTION IF EXISTS handle_usdt_transfer_status();

-- Create function to handle USDT transfer status changes
CREATE OR REPLACE FUNCTION handle_usdt_transfer_status()
RETURNS trigger AS $$
DECLARE
  _has_permission boolean;
BEGIN
  -- For new transfers
  IF TG_OP = 'INSERT' THEN
    IF NEW.destination_currency = 'USDT' THEN
      -- Check if user has approved USD permission
      SELECT EXISTS (
        SELECT 1 FROM usd_permissions
        WHERE user_id = NEW.user_id
        AND status = 'approved'
      ) INTO _has_permission;

      -- Set initial status based on permission
      NEW.status := CASE 
        WHEN _has_permission THEN 'pending'
        ELSE 'pending_usd_approval'
      END;
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
    CASE OLD.status
      WHEN 'pending_usd_approval' THEN
        IF NEW.status = 'pending' THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Transfers in pending_usd_approval state can only move to pending or failed';
        
      WHEN 'pending' THEN
        IF NEW.status = 'completed' THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Transfers in pending state can only move to completed or failed';
        
      WHEN 'completed' THEN
        RAISE EXCEPTION 'Cannot modify a completed transfer';
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

-- Create function to handle USD permission changes
CREATE OR REPLACE FUNCTION handle_usd_permission_change()
RETURNS trigger AS $$
BEGIN
  -- If permission is approved, update all pending_usd_approval transfers to pending
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE transfers
    SET status = 'pending'
    WHERE user_id = NEW.user_id
    AND destination_currency = 'USDT'
    AND status = 'pending_usd_approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for USD permission changes
CREATE TRIGGER handle_usd_permission_change_trigger
  AFTER UPDATE ON usd_permissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_usd_permission_change();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfers_user_status_currency 
ON transfers(user_id, status, destination_currency);

-- Add documentation
COMMENT ON TABLE transfers IS E'USDT transfers follow this flow:\n1. pending_usd_approval (if user not approved)\n2. pending (after user approval)\n3. completed (after admin confirmation)\n\nNote: failed state can be set from any state';