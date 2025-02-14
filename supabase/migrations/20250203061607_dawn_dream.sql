-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own support chats" ON support_chats;
DROP POLICY IF EXISTS "Users can create support chats" ON support_chats;
DROP POLICY IF EXISTS "Users and admins can update support chats" ON support_chats;
DROP POLICY IF EXISTS "Users can read messages from their chats" ON support_messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON support_messages;

-- Create simplified policies for support_chats
CREATE POLICY "support_chats_select_policy"
  ON support_chats FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "support_chats_insert_policy"
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

CREATE POLICY "support_chats_update_policy"
  ON support_chats FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create simplified policies for support_messages
CREATE POLICY "support_messages_select_policy"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

CREATE POLICY "support_messages_insert_policy"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_role_admin ON profiles(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_support_chats_user_status ON support_chats(user_id, status) WHERE status = 'open';