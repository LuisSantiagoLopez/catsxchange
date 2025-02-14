-- First update exchange_rate_history to remove invalid pairs
UPDATE exchange_rate_history
SET currency_pair = 'USDT/MXN'
WHERE currency_pair NOT IN (
  'USDT/MXN', 'USDT/PEN',
  'MXN/USDT', 'PEN/USDT',
  'MXN/PEN', 'PEN/MXN'
);

-- Then update exchange_rates to remove invalid pairs
UPDATE exchange_rates
SET currency_pair = 'USDT/MXN'
WHERE currency_pair NOT IN (
  'USDT/MXN', 'USDT/PEN',
  'MXN/USDT', 'PEN/USDT',
  'MXN/PEN', 'PEN/MXN'
);

-- Now we can safely update the constraints
ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS valid_currency_pair;
ALTER TABLE exchange_rates ADD CONSTRAINT valid_currency_pair 
  CHECK (currency_pair IN (
    'USDT/MXN', 'USDT/PEN',
    'MXN/USDT', 'PEN/USDT',
    'MXN/PEN', 'PEN/MXN'
  ));

ALTER TABLE exchange_rate_history DROP CONSTRAINT IF EXISTS valid_currency_pair;
ALTER TABLE exchange_rate_history ADD CONSTRAINT valid_currency_pair 
  CHECK (currency_pair IN (
    'USDT/MXN', 'USDT/PEN',
    'MXN/USDT', 'PEN/USDT',
    'MXN/PEN', 'PEN/MXN'
  ));

-- Add comment explaining the currency pairs
COMMENT ON TABLE exchange_rates IS 'Exchange rates for MXN, PEN and USDT currency pairs';
COMMENT ON TABLE exchange_rate_history IS 'Historical exchange rates for MXN, PEN and USDT currency pairs';

-- Initialize missing currency pairs if they don't exist
INSERT INTO exchange_rates (currency_pair, provider_rate, our_rate, profit_margin)
SELECT pair, 1.0, 1.0, 0.02
FROM (VALUES
  ('USDT/MXN'),
  ('USDT/PEN'),
  ('MXN/USDT'),
  ('PEN/USDT'),
  ('MXN/PEN'),
  ('PEN/MXN')
) AS pairs(pair)
WHERE NOT EXISTS (
  SELECT 1 FROM exchange_rates WHERE currency_pair = pairs.pair
);