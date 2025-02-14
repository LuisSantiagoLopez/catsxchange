/*
  # Actualizar tabla de transferencias

  1. Cambios
    - Hacer opcional la columna card_id
    - Actualizar las políticas de seguridad

  2. Notas
    - Esto permite transferencias sin necesidad de una tarjeta asociada
    - Mantiene la compatibilidad con el sistema existente
*/

-- Hacer card_id opcional
ALTER TABLE transfers
ALTER COLUMN card_id DROP NOT NULL;

-- Actualizar las políticas para reflejar el cambio
DROP POLICY IF EXISTS "Transfer read access" ON transfers;
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;

CREATE POLICY "Transfer read access"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      type = 'other'
      OR EXISTS (
        SELECT 1 FROM usd_permissions
        WHERE user_id = auth.uid()
        AND status = 'approved'
      )
    )
  );