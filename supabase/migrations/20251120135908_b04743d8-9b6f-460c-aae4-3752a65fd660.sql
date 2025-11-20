-- CRITICAL SECURITY FIX: Remove user ability to update their own usage
-- This prevents users from bypassing payment and usage limits

-- Drop the dangerous UPDATE policy
DROP POLICY IF EXISTS "Users can update their own usage" ON public.user_usage;

-- Add a comment explaining why users cannot update
COMMENT ON TABLE public.user_usage IS 'Usage tracking table. Users can only SELECT their data. All updates must be done via service role in edge functions to prevent bypassing payment/limits.';