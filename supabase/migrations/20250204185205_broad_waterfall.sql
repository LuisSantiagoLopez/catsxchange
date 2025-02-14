-- Drop all existing policies first
DO $$ 
BEGIN
  -- Drop all policies on usd_permissions
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON usd_permissions', policyname),
      '; '
    )
    FROM pg_policies 
    WHERE tablename = 'usd_permissions'
  );
END $$;

-- Create new policies with unique names
CREATE POLICY "user_permissions_read"
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

CREATE POLICY "user_permissions_request"
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

CREATE POLICY "admin_permissions_update"
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