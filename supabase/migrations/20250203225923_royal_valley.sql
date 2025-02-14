-- Initialize exchange rates for all currency pairs
INSERT INTO exchange_rates (currency_pair, provider_rate, our_rate, profit_margin)
SELECT 
  pair,
  1.0 as provider_rate,
  1.0 as our_rate,
  0.02 as profit_margin
FROM (
  SELECT 'MXN/PEN' as pair UNION ALL
  SELECT 'MXN/COP' UNION ALL
  SELECT 'MXN/VES' UNION ALL
  SELECT 'PEN/MXN' UNION ALL
  SELECT 'PEN/COP' UNION ALL
  SELECT 'PEN/VES' UNION ALL
  SELECT 'COP/MXN' UNION ALL
  SELECT 'COP/PEN' UNION ALL
  SELECT 'COP/VES' UNION ALL
  SELECT 'VES/MXN' UNION ALL
  SELECT 'VES/PEN' UNION ALL
  SELECT 'VES/COP'
) pairs
WHERE NOT EXISTS (
  SELECT 1 FROM exchange_rates WHERE currency_pair = pairs.pair
);

-- Add comment explaining the initialization
COMMENT ON TABLE exchange_rates IS 'Exchange rates for all currency pairs including direct conversions between any two currencies';