/*
  # Fix Profiles RLS Policies

  1. Changes
    - Add policy for inserting new profiles during signup
    - Fix profile querying policies
    - Remove admin-only operations

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policy for profile creation during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update access for own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for registration"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);