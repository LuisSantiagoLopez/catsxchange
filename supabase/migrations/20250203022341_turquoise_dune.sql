/*
  # Implementación de transferencias internacionales

  1. Nuevas Tablas
    - `usd_permissions`: Permisos para envíos en USD
      - `id` (uuid, primary key)
      - `user_id` (uuid, referencia a profiles)
      - `admin_id` (uuid, referencia a profiles)
      - `status` (text: pending, approved, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modificaciones
    - Tabla `transfers`:
      - Nuevas columnas para manejo de divisas y detalles de destino
      - Soporte para diferentes tipos de transferencia

  3. Seguridad
    - Políticas RLS para `usd_permissions`
    - Actualización de políticas para `transfers`
*/

-- Crear tabla de permisos USD
CREATE TABLE usd_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Habilitar RLS para permisos USD
ALTER TABLE usd_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para permisos USD
CREATE POLICY "Users can read own permissions"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can request permissions"
  ON usd_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM usd_permissions
      WHERE user_id = auth.uid()
      AND status = 'pending'
    )
  );

CREATE POLICY "Admins can update permissions"
  ON usd_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Modificar tabla de transferencias
ALTER TABLE transfers
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'other',
ADD COLUMN IF NOT EXISTS origin_currency text,
ADD COLUMN IF NOT EXISTS destination_currency text,
ADD COLUMN IF NOT EXISTS exchange_rate numeric,
ADD COLUMN IF NOT EXISTS destination_amount numeric,
ADD COLUMN IF NOT EXISTS destination_type text,
ADD COLUMN IF NOT EXISTS destination_details jsonb DEFAULT '{}'::jsonb,
ADD CONSTRAINT valid_transfer_type CHECK (type IN ('usd', 'other')),
ADD CONSTRAINT valid_destination_type CHECK (destination_type IN ('clabe', 'card'));

-- Función para validar permisos USD
CREATE OR REPLACE FUNCTION check_usd_permission() 
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'usd' THEN
    IF NOT EXISTS (
      SELECT 1 FROM usd_permissions
      WHERE user_id = NEW.user_id
      AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Usuario no tiene permiso para envíos USD';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para validar permisos USD
CREATE TRIGGER check_usd_permission_trigger
  BEFORE INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION check_usd_permission();

-- Actualizar políticas de transferencias
DROP POLICY IF EXISTS "Transfer read access" ON transfers;
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

DROP POLICY IF EXISTS "Users can insert own transfers" ON transfers;
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