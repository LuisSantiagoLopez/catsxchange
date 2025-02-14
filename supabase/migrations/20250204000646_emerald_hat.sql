-- Drop existing trigger and function
DROP TRIGGER IF EXISTS track_transfer_statistics ON transfers;
DROP FUNCTION IF EXISTS track_transfer_statistics();

-- Create improved function to track transfer statistics with proper profit calculation
CREATE OR REPLACE FUNCTION track_transfer_statistics()
RETURNS trigger AS $$
DECLARE
  _profit numeric;
  _rate record;
BEGIN
  -- Get the exchange rate record
  SELECT * INTO _rate 
  FROM exchange_rates 
  WHERE currency_pair = CASE
    WHEN NEW.destination_currency = 'USDT' THEN
      NEW.origin_currency || '/USDT'
    ELSE
      'USDT/' || NEW.destination_currency
    END
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate profit based on exchange rate and amount
  IF _rate IS NOT NULL THEN
    _profit := NEW.destination_amount * _rate.profit_margin;
  ELSE
    -- Default profit margin if no rate found
    _profit := NEW.destination_amount * 0.02;
  END IF;

  -- Insert statistics record
  INSERT INTO transfer_statistics (
    transfer_id,
    user_id,
    origin_currency,
    destination_currency,
    amount,
    converted_amount,
    exchange_rate,
    profit
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.origin_currency,
    NEW.destination_currency,
    NEW.amount,
    NEW.destination_amount,
    NEW.exchange_rate,
    _profit
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transfer statistics
CREATE TRIGGER track_transfer_statistics
  AFTER INSERT OR UPDATE ON transfers
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_transfer_statistics();

-- Add comment explaining the profit calculation
COMMENT ON FUNCTION track_transfer_statistics() IS 'Tracks transfer statistics and calculates profit based on exchange rate margins';