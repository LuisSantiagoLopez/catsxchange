-- Drop existing constraint
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS valid_destination_type;

-- Add updated constraint for destination type
ALTER TABLE transfers ADD CONSTRAINT valid_destination_type
  CHECK (
    (type = 'cardless' AND destination_type IS NULL) OR
    (type != 'cardless' AND destination_type IN ('clabe', 'card'))
  );

-- Update existing transfers if needed
UPDATE transfers 
SET destination_type = NULL 
WHERE type = 'cardless';

-- Add comment explaining constraints
COMMENT ON TABLE transfers IS E'Transfer types and destination types:\n- Regular transfers (type=other): must have clabe or card destination\n- Cardless transfers (type=cardless): must have NULL destination_type\n- USDT transfers (type=usd): must have clabe or card destination';