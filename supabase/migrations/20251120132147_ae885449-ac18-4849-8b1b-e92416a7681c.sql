-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_usage table to track automation usage
CREATE TABLE public.user_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  has_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- User usage policies
CREATE POLICY "Users can view their own usage"
ON public.user_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
ON public.user_usage
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage"
ON public.user_usage
FOR INSERT
WITH CHECK (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Insert into user_usage with 3 free uses
  INSERT INTO public.user_usage (user_id, usage_count)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update profiles timestamp
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

-- Function to update user_usage timestamp
CREATE OR REPLACE FUNCTION public.update_user_usage_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_user_usage_updated_at();

-- Update automation_sessions to track user_id
ALTER TABLE public.automation_sessions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS for automation_sessions to be user-specific
DROP POLICY IF EXISTS "Allow all operations on automation_sessions" ON public.automation_sessions;

CREATE POLICY "Users can view their own sessions"
ON public.automation_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.automation_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.automation_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Update RLS for automation_logs to be user-specific
DROP POLICY IF EXISTS "Allow all operations on automation_logs" ON public.automation_logs;

CREATE POLICY "Users can view logs for their sessions"
ON public.automation_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.automation_sessions
    WHERE automation_sessions.id = automation_logs.session_id
    AND automation_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert logs"
ON public.automation_logs
FOR INSERT
WITH CHECK (true);