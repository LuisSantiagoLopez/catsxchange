-- Drop existing notification policies if any
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- Create simplified notification policies
CREATE POLICY "notifications_read_policy"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to create notifications for admins
CREATE POLICY "notifications_insert_policy"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El usuario puede crear notificaciones para sí mismo
    user_id = auth.uid()
    OR
    -- O para administradores si está autenticado
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = notifications.user_id
      AND role = 'admin'
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);