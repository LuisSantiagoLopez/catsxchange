-- Drop existing policies
DROP POLICY IF EXISTS "Transfer read access" ON transfers;
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;
DROP POLICY IF EXISTS "Admin can update transfers" ON transfers;

-- Create improved policies
CREATE POLICY "transfers_select_policy"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "transfers_insert_policy"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Allow cardless transfers
      type = 'cardless'
      OR
      -- Allow regular transfers
      type = 'other'
      OR
      -- Allow USDT transfers if user has permission
      (
        type = 'usd'
        AND EXISTS (
          SELECT 1 FROM usd_permissions
          WHERE user_id = auth.uid()
          AND status = 'approved'
        )
      )
    )
  );

CREATE POLICY "transfers_update_policy"
  ON transfers FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own transfers
    user_id = auth.uid()
    OR
    -- Admins can update any transfer
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment explaining policies
COMMENT ON TABLE transfers IS 'Transfers table with support for cardless withdrawals, USDT transfers, and regular transfers';