-- Drop existing policies
DROP POLICY IF EXISTS "support_chats_select_policy" ON support_chats;
DROP POLICY IF EXISTS "support_chats_insert_policy" ON support_chats;
DROP POLICY IF EXISTS "support_chats_update_policy" ON support_chats;
DROP POLICY IF EXISTS "support_messages_select_policy" ON support_messages;
DROP POLICY IF EXISTS "support_messages_insert_policy" ON support_messages;

-- Create a function to check admin role without recursion
CREATE OR REPLACE FUNCTION is_admin_cached()
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

-- Create simplified policies for support_chats
CREATE POLICY "support_chats_select"
  ON support_chats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin_cached());

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
  USING (user_id = auth.uid() OR is_admin_cached());

-- Create simplified policies for support_messages
CREATE POLICY "support_messages_select"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (user_id = auth.uid() OR is_admin_cached())
    )
  );

CREATE POLICY "support_messages_insert"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (user_id = auth.uid() OR is_admin_cached())
    )
  );

-- Add comment explaining the changes
COMMENT ON FUNCTION is_admin_cached() IS 'Cached function to check admin role without recursion';

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_support_chats_user_status ON support_chats(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON support_messages(chat_id);