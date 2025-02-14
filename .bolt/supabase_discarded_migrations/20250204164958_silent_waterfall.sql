-- Drop existing constraint without touching triggers
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_transfer_status;

-- Add new constraint without pending_usd_approval
ALTER TABLE transfers ADD CONSTRAINT valid_transfer_status 
  CHECK (status IN ('pending', 'pending_cardless', 'completed', 'failed'));

-- Update existing transfers
UPDATE transfers 
SET status = 'pending'
WHERE status = 'pending_usd_approval'
AND destination_currency = 'USDT';

-- Add comment explaining the simplified flow
COMMENT ON TABLE transfers IS 'Transfers with simplified validation - USDT transfers require verified Binance accounts';