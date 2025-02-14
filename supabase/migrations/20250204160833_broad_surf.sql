-- Drop existing constraint
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_destination_type;

-- Add updated constraint for destination type that properly handles all cases
ALTER TABLE transfers ADD CONSTRAINT valid_destination_type
  CHECK (
    -- Cardless transfers must have null destination_type
    (type = 'cardless' AND destination_type IS NULL) OR
    -- USDT transfers must have binance destination_type
    (destination_currency = 'USDT' AND destination_type = 'binance') OR
    -- Other transfers must have clabe or card destination_type
    (type = 'other' AND destination_type IN ('clabe', 'card'))
  );

-- Update existing transfers to ensure consistency
UPDATE transfers 
SET destination_type = NULL 
WHERE type = 'cardless';

-- Add comment explaining constraints
COMMENT ON TABLE transfers IS E'Transfer types and destination types:\n- Regular transfers (type=other): must have clabe or card destination\n- Cardless transfers (type=cardless): must have NULL destination_type\n- USDT transfers (destination_currency=USDT): must have binance destination_type';