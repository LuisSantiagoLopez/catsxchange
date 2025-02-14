-- Create a function to get the admin ID
CREATE OR REPLACE FUNCTION get_admin_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '89efab8d-36d8-4cf6-b3c7-8806ff9b1409'::uuid;
$$;

-- Update existing policies to use the admin ID directly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN auth.uid() = get_admin_id();
END;
$$;

-- Update support chat policies
DROP POLICY IF EXISTS "support_chats_select" ON support_chats;
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
CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON support_messages(chat_id);