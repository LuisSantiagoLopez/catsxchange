/*
  # Add Support Chat Tables

  1. New Tables
    - `support_chats`: General support chats for users
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `status` (text): 'open' or 'closed'
    
    - `support_messages`: Messages in support chats
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references support_chats)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamptz)
      - `read` (boolean)

  2. Security
    - Enable RLS on both tables
    - Add policies for users and admins
*/

-- Create support_chats table
CREATE TABLE support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  CONSTRAINT valid_status CHECK (status IN ('open', 'closed'))
);

-- Create support_messages table
CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_chats
CREATE POLICY "Users can read own support chats"
  ON support_chats FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create support chats"
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

CREATE POLICY "Users and admins can update support chats"
  ON support_chats FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for support_messages
CREATE POLICY "Users can read messages from their chats"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE id = chat_id
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX idx_support_chats_status ON support_chats(status);
CREATE INDEX idx_support_messages_chat_id ON support_messages(chat_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);

-- Function to update chat updated_at
CREATE OR REPLACE FUNCTION update_support_chat_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE support_chats
  SET updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chat timestamp on new message
CREATE TRIGGER update_support_chat_timestamp
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_chat_timestamp();