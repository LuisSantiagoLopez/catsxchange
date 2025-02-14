-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;

-- Create improved policies
CREATE POLICY "usd_permissions_select"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "usd_permissions_insert"
  ON usd_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to request permissions for themselves
    (user_id = auth.uid() AND admin_id IS NULL)
    OR
    -- Allow admins to create permissions for any user
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "usd_permissions_update"
  ON usd_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment explaining policies
COMMENT ON TABLE usd_permissions IS 'USD permissions with proper RLS policies for users and admins';