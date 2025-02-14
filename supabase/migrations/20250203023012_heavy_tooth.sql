-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Users can request permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON usd_permissions;
DROP POLICY IF EXISTS "Transfer read access" ON transfers;
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;
DROP POLICY IF EXISTS "Users can insert own transfers" ON transfers;

-- Políticas para permisos USD (corregidas para evitar recursión infinita)
CREATE POLICY "Users can read own permissions"
  ON usd_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Users can request permissions"
  ON usd_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM usd_permissions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update permissions"
  ON usd_permissions FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Modificar tabla de transferencias (solo si las columnas no existen)
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'type') THEN
    ALTER TABLE transfers ADD COLUMN type text NOT NULL DEFAULT 'other';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'origin_currency') THEN
    ALTER TABLE transfers ADD COLUMN origin_currency text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'destination_currency') THEN
    ALTER TABLE transfers ADD COLUMN destination_currency text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'exchange_rate') THEN
    ALTER TABLE transfers ADD COLUMN exchange_rate numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'destination_amount') THEN
    ALTER TABLE transfers ADD COLUMN destination_amount numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'destination_type') THEN
    ALTER TABLE transfers ADD COLUMN destination_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'destination_details') THEN
    ALTER TABLE transfers ADD COLUMN destination_details jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'transfers' AND constraint_name = 'valid_transfer_type'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT valid_transfer_type CHECK (type IN ('usd', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'transfers' AND constraint_name = 'valid_destination_type'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT valid_destination_type CHECK (destination_type IN ('clabe', 'card'));
  END IF;
END $$;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS check_usd_permission_trigger ON transfers;
DROP FUNCTION IF EXISTS check_usd_permission();

-- Recreate function for validar permisos USD
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

-- Recreate trigger para validar permisos USD
CREATE TRIGGER check_usd_permission_trigger
  BEFORE INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION check_usd_permission();

-- Crear nuevas políticas de transferencias
CREATE POLICY "Transfer read access"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
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