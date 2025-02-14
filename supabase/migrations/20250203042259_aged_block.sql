-- Drop existing notification policies
DROP POLICY IF EXISTS "notifications_read_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Create simplified notification policies
CREATE POLICY "notifications_read_policy"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "notifications_insert_policy"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El usuario puede crear notificaciones para sí mismo
    user_id = auth.uid()
    OR
    -- O el destinatario es el admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = notifications.user_id
      AND email = 'admin@mail.com'
    )
    OR
    -- O el creador es el admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
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

CREATE POLICY "notifications_delete_policy"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);