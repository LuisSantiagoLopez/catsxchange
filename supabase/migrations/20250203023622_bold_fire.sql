-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;

-- Create materialized admin role view for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id FROM profiles WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS admin_users_id_idx ON admin_users(id);

-- Create function to refresh admin users
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh admin users
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
CREATE TRIGGER refresh_admin_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_admin_users();

-- Recreate policies with optimized checks
CREATE POLICY "Users can read own permissions"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
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
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Initial refresh of admin users view
REFRESH MATERIALIZED VIEW admin_users;