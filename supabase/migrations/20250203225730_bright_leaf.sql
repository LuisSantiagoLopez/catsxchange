-- Drop existing constraint
ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS valid_currency_pair;

-- Add new constraint with all possible currency pairs
ALTER TABLE exchange_rates ADD CONSTRAINT valid_currency_pair 
  CHECK (currency_pair IN (
    'USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES',
    'MXN/USDT', 'PEN/USDT', 'COP/USDT', 'VES/USDT',
    'MXN/PEN', 'MXN/COP', 'MXN/VES',
    'PEN/MXN', 'PEN/COP', 'PEN/VES',
    'COP/MXN', 'COP/PEN', 'COP/VES',
    'VES/MXN', 'VES/PEN', 'VES/COP'
  ));

-- Update exchange_rate_history constraint
ALTER TABLE exchange_rate_history DROP CONSTRAINT IF EXISTS valid_currency_pair;
ALTER TABLE exchange_rate_history ADD CONSTRAINT valid_currency_pair 
  CHECK (currency_pair IN (
    'USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES',
    'MXN/USDT', 'PEN/USDT', 'COP/USDT', 'VES/USDT',
    'MXN/PEN', 'MXN/COP', 'MXN/VES',
    'PEN/MXN', 'PEN/COP', 'PEN/VES',
    'COP/MXN', 'COP/PEN', 'COP/VES',
    'VES/MXN', 'VES/PEN', 'VES/COP'
  ));

-- Add comment explaining the currency pairs
COMMENT ON TABLE exchange_rates IS 'Exchange rates for all currency pairs including cross-currency conversions';