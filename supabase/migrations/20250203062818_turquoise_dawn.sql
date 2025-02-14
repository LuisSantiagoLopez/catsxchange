-- Drop existing policies
DROP POLICY IF EXISTS "chats_read_policy" ON chats;
DROP POLICY IF EXISTS "chats_insert_policy" ON chats;
DROP POLICY IF EXISTS "chat_messages_read_policy" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON chat_messages;

-- Create simplified policies for chats
CREATE POLICY "chats_read_policy"
  ON chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers
      WHERE transfers.id = chats.transfer_id
      AND (
        transfers.user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

CREATE POLICY "chats_insert_policy"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transfers
      WHERE transfers.id = transfer_id
      AND (
        transfers.user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

-- Create simplified policies for chat messages
CREATE POLICY "chat_messages_read_policy"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      JOIN transfers ON transfers.id = chats.transfer_id
      WHERE chats.id = chat_messages.chat_id
      AND (
        transfers.user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

CREATE POLICY "chat_messages_insert_policy"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      JOIN transfers ON transfers.id = chats.transfer_id
      WHERE chats.id = chat_id
      AND (
        transfers.user_id = auth.uid()
        OR auth.uid() = get_admin_id()
      )
    )
  );

-- Drop and recreate trigger with SECURITY DEFINER
DROP TRIGGER IF EXISTS create_transfer_chat_trigger ON transfers;
DROP FUNCTION IF EXISTS create_transfer_chat();

CREATE OR REPLACE FUNCTION create_transfer_chat()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO chats (transfer_id)
  VALUES (NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error if needed but continue
    RETURN NEW;
END;
$$;

CREATE TRIGGER create_transfer_chat_trigger
  AFTER INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_chat();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_transfer_id ON chats(transfer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);