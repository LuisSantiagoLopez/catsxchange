-- Create or replace function to ensure admin exists
CREATE OR REPLACE FUNCTION ensure_admin_exists()
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
  FROM profiles
  WHERE email = 'admin@mail.com'
  LIMIT 1;

  -- If admin doesn't exist, create it
  IF admin_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@mail.com',
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Administrator"}',
      NOW(),
      NOW()
    )
    RETURNING id INTO admin_id;

    -- Create admin profile
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      'admin@mail.com',
      'Administrator',
      'admin',
      NOW(),
      NOW()
    );
  END IF;

  RETURN admin_id;
END;
$$;

-- Ensure admin exists
SELECT ensure_admin_exists();

-- Create function to get admin ID
CREATE OR REPLACE FUNCTION get_admin_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM profiles
  WHERE email = 'admin@mail.com'
  LIMIT 1;
  
  RETURN admin_id;
END;
$$;

-- Update support chat policies to use the new function
DROP POLICY IF EXISTS "support_chats_select" ON support_chats;
DROP POLICY IF EXISTS "support_chats_insert" ON support_chats;
DROP POLICY IF EXISTS "support_chats_update" ON support_chats;
DROP POLICY IF EXISTS "support_messages_select" ON support_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON support_messages;

CREATE POLICY "support_chats_select"
  ON support_chats FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() = get_admin_id()
  );

CREATE POLICY "support_chats_insert"
  ON support_chats FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM support_chats
      WHERE user_id = auth.uid()
      AND status = 'open'
    )
  );

CREATE POLICY "support_chats_update"
  ON support_chats FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() = get_admin_id()
  );

CREATE POLICY "support_messages_select"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

CREATE POLICY "support_messages_insert"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_admin_email 
ON profiles(email) 
WHERE email = 'admin@mail.com';