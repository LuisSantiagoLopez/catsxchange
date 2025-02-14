/*
  # Implementación del sistema de administración

  1. Cambios en la Estructura
    - Agregar columna `role` a la tabla `profiles`
    - Valores posibles: 'admin' o 'user'
    - Valor por defecto: 'user'

  2. Permisos y Políticas
    - Actualizar políticas existentes para considerar el rol de administrador
    - Agregar políticas específicas para administradores
    - Permitir que los administradores vean y gestionen todas las transferencias
*/

-- Agregar columna role a profiles si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Actualizar políticas para transferencias
DROP POLICY IF EXISTS "Users can read own transfers" ON transfers;
CREATE POLICY "Transfer read access"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Permitir que los administradores actualicen transferencias
DROP POLICY IF EXISTS "Admin can update transfers" ON transfers;
CREATE POLICY "Admin can update transfers"
  ON transfers FOR UPDATE
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

-- Actualizar el trigger de creación de usuarios para incluir el rol por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email = 'admin@mail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = CASE 
      WHEN EXCLUDED.email = 'admin@mail.com' THEN 'admin'
      ELSE profiles.role
    END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;