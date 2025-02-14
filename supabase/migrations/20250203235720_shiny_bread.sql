-- Create saved_accounts table
CREATE TABLE saved_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  usdt_enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_account_type CHECK (type IN ('clabe', 'card')),
  CONSTRAINT valid_details CHECK (
    CASE
      WHEN type = 'clabe' THEN
        (details->>'clabe') IS NOT NULL
      WHEN type = 'card' THEN
        (details->>'card_number') IS NOT NULL AND
        (details->>'card_holder') IS NOT NULL
      ELSE false
    END
  )
);

-- Enable RLS
ALTER TABLE saved_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own accounts"
  ON saved_accounts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create accounts"
  ON saved_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Split update policy into two separate policies for better control
CREATE POLICY "Users can update own account details"
  ON saved_accounts FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    -- No permitir actualizar campos de verificación
    usdt_enabled IS NOT DISTINCT FROM usdt_enabled AND
    verified_at IS NOT DISTINCT FROM verified_at AND
    verified_by IS NOT DISTINCT FROM verified_by
  );

CREATE POLICY "Admins can verify accounts"
  ON saved_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete own accounts"
  ON saved_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_saved_accounts_updated_at
  BEFORE UPDATE ON saved_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add indexes
CREATE INDEX idx_saved_accounts_user_id ON saved_accounts(user_id);
CREATE INDEX idx_saved_accounts_usdt_enabled ON saved_accounts(usdt_enabled) WHERE usdt_enabled = true;

-- Add function to validate USDT transfers
CREATE OR REPLACE FUNCTION validate_usdt_transfer()
RETURNS trigger AS $$
BEGIN
  -- Solo validar transferencias USDT
  IF NEW.destination_currency = 'USDT' THEN
    -- Verificar que la cuenta destino esté habilitada para USDT
    IF NOT EXISTS (
      SELECT 1 FROM saved_accounts
      WHERE id = (NEW.destination_details->>'account_id')::uuid
      AND usdt_enabled = true
      AND verified_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'La cuenta destino no está habilitada para recibir USDT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for USDT validation
CREATE TRIGGER validate_usdt_transfer_trigger
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION validate_usdt_transfer();

-- Add comment
COMMENT ON TABLE saved_accounts IS 'Cuentas guardadas de usuarios con verificación individual para USDT';