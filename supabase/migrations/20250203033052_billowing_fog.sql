/*
  # Ajuste de políticas de notificaciones

  1. Cambios
    - Actualizar políticas de notificaciones para permitir que los usuarios creen notificaciones para administradores
    - Mantener la seguridad para que los usuarios solo puedan leer sus propias notificaciones
    - Permitir que los administradores lean y creen notificaciones para cualquier usuario

  2. Seguridad
    - Se mantiene RLS habilitado
    - Los usuarios solo pueden ver sus propias notificaciones
    - Los administradores pueden ver todas las notificaciones
*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "notifications_read_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;

-- Crear nuevas políticas
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
    -- O el destinatario es un admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = notifications.user_id
      AND role = 'admin'
    )
    OR
    -- O el creador es un admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());