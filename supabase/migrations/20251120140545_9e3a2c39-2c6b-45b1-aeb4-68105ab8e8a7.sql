-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to encrypt passwords
CREATE OR REPLACE FUNCTION public.encrypt_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from vault or use a secure key
  -- In production, this should come from Supabase Vault
  encryption_key := current_setting('app.settings.encryption_key', true);
  IF encryption_key IS NULL THEN
    encryption_key := encode(gen_random_bytes(32), 'hex');
  END IF;
  
  RETURN encode(
    encrypt(
      password_text::bytea,
      encryption_key::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

-- Create function to decrypt passwords
CREATE OR REPLACE FUNCTION public.decrypt_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from vault or use a secure key
  encryption_key := current_setting('app.settings.encryption_key', true);
  IF encryption_key IS NULL THEN
    encryption_key := encode(gen_random_bytes(32), 'hex');
  END IF;
  
  RETURN convert_from(
    decrypt(
      decode(encrypted_password, 'base64'),
      encryption_key::bytea,
      'aes'
    ),
    'utf8'
  );
END;
$$;

-- Encrypt existing passwords in saved_credentials
UPDATE public.saved_credentials
SET password = public.encrypt_password(password)
WHERE password IS NOT NULL
AND length(password) < 100; -- Only encrypt if not already encrypted

-- Add a comment to document the encryption
COMMENT ON COLUMN public.saved_credentials.password IS 'Encrypted password using AES encryption. Use decrypt_password() function to read.';