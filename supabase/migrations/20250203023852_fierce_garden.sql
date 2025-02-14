-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;

-- Simplify policies to avoid recursion
CREATE POLICY "Users can read own permissions"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can request permissions"
  ON usd_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM usd_permissions
      WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
    )
  );

CREATE POLICY "Admins can update permissions"
  ON usd_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Drop materialized view and related objects as they're no longer needed
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
DROP FUNCTION IF EXISTS refresh_admin_users();
DROP MATERIALIZED VIEW IF EXISTS admin_users;

-- Add index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_usd_permissions_user_status ON usd_permissions(user_id, status);