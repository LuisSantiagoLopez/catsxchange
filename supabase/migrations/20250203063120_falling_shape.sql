-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS create_transfer_chat_trigger ON transfers;
DROP TRIGGER IF EXISTS handle_chat_message_trigger ON chat_messages;
DROP FUNCTION IF EXISTS create_transfer_chat();
DROP FUNCTION IF EXISTS handle_chat_message();

-- Create improved function to create chat and initial message
CREATE OR REPLACE FUNCTION create_transfer_chat()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _chat_id uuid;
BEGIN
  -- Create chat
  INSERT INTO chats (transfer_id)
  VALUES (NEW.id)
  RETURNING id INTO _chat_id;

  -- Create initial system message
  INSERT INTO chat_messages (
    chat_id,
    user_id,
    content
  ) VALUES (
    _chat_id,
    NEW.user_id,
    CASE
      WHEN NEW.type = 'usd' THEN 'Transferencia USD iniciada'
      ELSE 'Transferencia internacional iniciada'
    END
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error if needed but continue
    RETURN NEW;
END;
$$;

-- Add function to handle chat messages and notifications
CREATE OR REPLACE FUNCTION handle_chat_message()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _transfer_id uuid;
  _recipient_id uuid;
  _admin_id uuid := get_admin_id();
  _chat_type text;
BEGIN
  -- Get transfer_id and type from chat
  SELECT c.transfer_id, t.type 
  INTO _transfer_id, _chat_type
  FROM chats c
  JOIN transfers t ON t.id = c.transfer_id
  WHERE c.id = NEW.chat_id;

  -- Get recipient_id (if sender is admin, notify user, otherwise notify admin)
  IF NEW.user_id = _admin_id THEN
    SELECT user_id INTO _recipient_id
    FROM transfers
    WHERE id = _transfer_id;
  ELSE
    _recipient_id := _admin_id;
  END IF;

  -- Create notification for recipient
  INSERT INTO notifications (
    user_id,
    title,
    content,
    read
  ) VALUES (
    _recipient_id,
    CASE 
      WHEN _chat_type = 'usd' THEN 'Nuevo mensaje en transferencia USD'
      ELSE 'Nuevo mensaje en transferencia internacional'
    END,
    NEW.content,
    false
  );

  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER create_transfer_chat_trigger
  AFTER INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_chat();

CREATE TRIGGER handle_chat_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_chat_message();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Update existing chats to have initial message if missing
DO $$
DECLARE
  _chat record;
BEGIN
  FOR _chat IN 
    SELECT c.id as chat_id, t.id as transfer_id, t.user_id, t.type
    FROM chats c
    JOIN transfers t ON t.id = c.transfer_id
    WHERE NOT EXISTS (
      SELECT 1 FROM chat_messages 
      WHERE chat_id = c.id
    )
  LOOP
    INSERT INTO chat_messages (
      chat_id,
      user_id,
      content
    ) VALUES (
      _chat.chat_id,
      _chat.user_id,
      CASE
        WHEN _chat.type = 'usd' THEN 'Transferencia USD iniciada'
        ELSE 'Transferencia internacional iniciada'
      END
    );
  END LOOP;
END $$;