-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on site_configs" ON public.site_configs;

-- Allow authenticated users to view site configs
CREATE POLICY "Users can view site configs"
ON public.site_configs
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update/delete site configs
CREATE POLICY "Service can manage site configs"
ON public.site_configs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);