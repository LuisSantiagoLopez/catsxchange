-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;

-- Create a function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified policies using the function
CREATE POLICY "Users can read own permissions"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin()
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
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_usd_permissions_user_status ON usd_permissions(user_id, status);

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION check_usd_permission() 
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'usd' THEN
    IF NOT EXISTS (
      SELECT 1 FROM usd_permissions
      WHERE user_id = NEW.user_id
      AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'No tienes permiso para realizar envíos en USD. Por favor, solicita acceso primero.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_blocked column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_blocked boolean DEFAULT false;
  END IF;
END $$;

-- Add last_login_at column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Create function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for last login update
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_login();