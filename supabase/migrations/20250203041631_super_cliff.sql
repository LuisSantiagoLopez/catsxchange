/*
  # Setup Admin User

  1. Changes
    - Creates admin user if it doesn't exist
    - Sets up proper authentication
    - Ensures admin role is set correctly
*/

-- Function to create admin user with proper authentication
CREATE OR REPLACE FUNCTION setup_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@mail.com'
  LIMIT 1;

  -- Create admin user if it doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users with encrypted password
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@mail.com',
      crypt('admin123', gen_salt('bf')), -- Default password: admin123
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Administrator"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;
  END IF;

  -- Ensure admin profile exists and has admin role
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    admin_user_id,
    'admin@mail.com',
    'Administrator',
    'admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    updated_at = NOW();
END;
$$;

-- Run the setup
SELECT setup_admin_user();

-- Create index for admin lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_admin_email 
ON profiles(email) 
WHERE email = 'admin@mail.com';

-- Drop previous function as it's no longer needed
DROP FUNCTION IF EXISTS get_admin_id();

-- Add comment explaining admin credentials
COMMENT ON FUNCTION setup_admin_user() IS 'Creates admin user with email: admin@mail.com and password: admin123';