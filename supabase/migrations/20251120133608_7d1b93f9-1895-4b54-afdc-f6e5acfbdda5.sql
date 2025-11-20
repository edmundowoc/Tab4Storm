-- Create saved_credentials table for storing generated login data
CREATE TABLE public.saved_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  site_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  successfully_registered BOOLEAN NOT NULL DEFAULT false,
  manual_needed BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.saved_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view their own credentials
CREATE POLICY "Users can view their own credentials"
ON public.saved_credentials
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert their own credentials"
ON public.saved_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials
CREATE POLICY "Users can update their own credentials"
ON public.saved_credentials
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own credentials"
ON public.saved_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_credentials_user_id ON public.saved_credentials(user_id);
CREATE INDEX idx_saved_credentials_url ON public.saved_credentials(url);