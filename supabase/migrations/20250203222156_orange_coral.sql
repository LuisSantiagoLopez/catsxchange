-- Drop existing triggers that might be causing recursion
DROP TRIGGER IF EXISTS check_expired_cardless_withdrawals ON cardless_withdrawals;
DROP FUNCTION IF EXISTS check_expired_cardless_withdrawals();

-- Simplify the cardless withdrawals table
ALTER TABLE cardless_withdrawals 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE cardless_withdrawals 
ADD CONSTRAINT valid_status CHECK (status IN ('active', 'expired'));

-- Create a simpler function to handle expiration
CREATE OR REPLACE FUNCTION expire_cardless_withdrawal(withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cardless_withdrawals
  SET status = 'expired'
  WHERE id = withdrawal_id
  AND expires_at < now()
  AND status = 'active';
END;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_cardless_withdrawals_status_expires 
ON cardless_withdrawals(status, expires_at) 
WHERE status = 'active';

-- Add comment explaining the changes
COMMENT ON FUNCTION expire_cardless_withdrawal IS 'Manually expire a cardless withdrawal code';