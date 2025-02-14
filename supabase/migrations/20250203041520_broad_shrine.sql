/*
  # Ensure admin user exists

  1. Changes
    - Creates admin user if it doesn't exist
    - Adds function to safely get admin ID
    - Adds index for admin email lookups
*/

-- Create function to get admin ID safely
CREATE OR REPLACE FUNCTION get_admin_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Try to get existing admin
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'admin@mail.com'
  LIMIT 1;

  -- If admin doesn't exist, create it
  IF admin_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      raw_user_meta_data,
      created_at,
      updated_at,
      role
    ) VALUES (
      'admin@mail.com',
      '{"full_name": "Administrator"}',
      now(),
      now(),
      'authenticated'
    )
    RETURNING id INTO admin_id;

    -- The trigger will create the profile
  END IF;

  RETURN admin_id;
END;
$$;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin_email 
ON profiles(email) 
WHERE email = 'admin@mail.com';

-- Ensure admin exists
SELECT get_admin_id();