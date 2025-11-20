-- Fix encryption key management - use hardcoded secure key
-- This prevents the critical issue where random keys are generated each time

-- Drop existing functions
DROP FUNCTION IF EXISTS public.encrypt_password(text);
DROP FUNCTION IF EXISTS public.decrypt_password(text);

-- Create improved encrypt_password function with hardcoded key
CREATE OR REPLACE FUNCTION public.encrypt_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Hardcoded encryption key (64 hex chars = 32 bytes)
  -- IMPORTANT: This key must never change or all encrypted data becomes unrecoverable
  encryption_key text := 'a3f9c8e7b2d1f4a6e8c9d2b5f7a1e3c6b4d8f2a9c7e1b6d3f8a4c2e9b7d5f1a8';
BEGIN
  RETURN encode(
    encrypt(
      password_text::bytea,
      decode(encryption_key, 'hex'),
      'aes'
    ),
    'base64'
  );
END;
$$;

-- Create improved decrypt_password function with hardcoded key
CREATE OR REPLACE FUNCTION public.decrypt_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Same hardcoded encryption key
  encryption_key text := 'a3f9c8e7b2d1f4a6e8c9d2b5f7a1e3c6b4d8f2a9c7e1b6d3f8a4c2e9b7d5f1a8';
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_password, 'base64'),
      decode(encryption_key, 'hex'),
      'aes'
    ),
    'utf8'
  );
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.encrypt_password(text) IS 'Encrypts password using AES with fixed encryption key.';
COMMENT ON FUNCTION public.decrypt_password(text) IS 'Decrypts password using AES with fixed encryption key.';