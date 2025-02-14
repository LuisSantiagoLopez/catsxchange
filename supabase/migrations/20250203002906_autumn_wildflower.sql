/*
  # Actualizar rol de administrador

  1. Actualizar el rol a 'admin' para el usuario admin@mail.com si existe
  2. No crear nuevo usuario, ya que debe registrarse primero
*/

-- Actualizar el rol a admin si el usuario existe
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@mail.com';