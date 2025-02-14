/*
  # Sistema de Chat para Transferencias

  1. Nuevas Tablas
    - `chats`: Almacena los chats por transferencia
    - `chat_messages`: Almacena los mensajes de cada chat

  2. Políticas
    - Políticas RLS para chats y mensajes
    - Control de acceso basado en propiedad de transferencia y rol de admin

  3. Triggers
    - Creación automática de chat al crear transferencia
*/

-- Crear tabla de chats
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de mensajes
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para chats
CREATE POLICY "chats_read_policy" ON chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers 
      WHERE transfers.id = chats.transfer_id 
      AND (
        transfers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "chats_insert_policy" ON chats
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transfers 
      WHERE transfers.id = transfer_id 
      AND transfers.user_id = auth.uid()
    )
  );

-- Políticas para mensajes
CREATE POLICY "chat_messages_read_policy" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      JOIN transfers ON transfers.id = chats.transfer_id
      WHERE chats.id = chat_messages.chat_id 
      AND (
        transfers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "chat_messages_insert_policy" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats 
      JOIN transfers ON transfers.id = chats.transfer_id
      WHERE chats.id = chat_id 
      AND (
        transfers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Trigger para crear chat automáticamente
CREATE OR REPLACE FUNCTION create_transfer_chat()
RETURNS trigger AS $$
BEGIN
  INSERT INTO chats (transfer_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_transfer_chat_trigger
  AFTER INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_chat();

-- Índices para optimización
CREATE INDEX idx_chats_transfer_id ON chats(transfer_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);