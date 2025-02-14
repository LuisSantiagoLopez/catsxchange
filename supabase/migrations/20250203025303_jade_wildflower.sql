-- Drop existing complex policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable profile creation on signup" ON profiles;
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;

-- Create a simple function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _role text;
BEGIN
  SELECT role INTO _role FROM profiles WHERE id = auth.uid();
  RETURN _role = 'admin';
END;
$$;

-- Simplified profile policies
CREATE POLICY "profiles_read_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Simplified USD permissions policies
CREATE POLICY "usd_permissions_read_policy"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "usd_permissions_insert_policy"
  ON usd_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND NOT EXISTS (
      SELECT 1 FROM usd_permissions 
      WHERE user_id = auth.uid() 
      AND status IN ('pending', 'approved')
    )
  );

CREATE POLICY "usd_permissions_update_policy"
  ON usd_permissions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add necessary indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_usd_permissions_user_status ON usd_permissions(user_id, status);