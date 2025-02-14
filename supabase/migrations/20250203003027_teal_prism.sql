/*
  # Agregar funcionalidad de borrado de cuenta

  1. Crear función para borrar cuenta de usuario
  2. Asegurar que se borren todos los datos relacionados
*/

-- Crear función para borrar cuenta
CREATE OR REPLACE FUNCTION delete_user_account(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Los datos relacionados se eliminarán automáticamente por las restricciones ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;