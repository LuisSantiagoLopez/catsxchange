-- Add has_seen_welcome column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_seen_welcome boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN profiles.has_seen_welcome IS 'Tracks if user has seen the welcome page';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_welcome ON profiles(has_seen_welcome) WHERE has_seen_welcome = false;