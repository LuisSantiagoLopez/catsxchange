-- Drop existing notification policies
DROP POLICY IF EXISTS "notifications_read_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

-- Create new notification policies
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
  WITH CHECK (true);  -- Allow all authenticated users to insert notifications

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());