-- Add binance type to saved_accounts
ALTER TABLE saved_accounts DROP CONSTRAINT IF EXISTS valid_account_type;
ALTER TABLE saved_accounts ADD CONSTRAINT valid_account_type 
  CHECK (type IN ('clabe', 'card', 'binance'));

-- Add constraint for binance account details
ALTER TABLE saved_accounts DROP CONSTRAINT IF EXISTS valid_details;
ALTER TABLE saved_accounts ADD CONSTRAINT valid_details 
  CHECK (
    CASE
      WHEN type = 'clabe' THEN
        (details->>'clabe') IS NOT NULL
      WHEN type = 'card' THEN
        (details->>'card_number') IS NOT NULL AND
        (details->>'card_holder') IS NOT NULL
      WHEN type = 'binance' THEN
        (details->>'binance_id') IS NOT NULL AND
        (details->>'binance_email') IS NOT NULL
      ELSE false
    END
  );

-- Add constraint to ensure only binance accounts can be USDT enabled
ALTER TABLE saved_accounts ADD CONSTRAINT binance_usdt_only
  CHECK (
    NOT usdt_enabled OR type = 'binance'
  );

-- Update existing accounts to ensure consistency
UPDATE saved_accounts 
SET usdt_enabled = false 
WHERE type != 'binance';

-- Add comment explaining binance account requirements
COMMENT ON TABLE saved_accounts IS 'Saved accounts for transfers. Only Binance accounts can be USDT enabled.';