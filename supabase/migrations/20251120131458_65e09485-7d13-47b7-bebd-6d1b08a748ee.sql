-- Create automation sessions table
CREATE TABLE public.automation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

-- Create automation logs table
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.automation_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create site configs table for storing custom site configurations
CREATE TABLE public.site_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_pattern TEXT NOT NULL,
  email_selector TEXT,
  password_selector TEXT,
  submit_selector TEXT,
  endpoint TEXT,
  field_mappings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_automation_sessions_status ON public.automation_sessions(status);
CREATE INDEX idx_automation_sessions_created_at ON public.automation_sessions(created_at DESC);
CREATE INDEX idx_automation_logs_session_id ON public.automation_logs(session_id);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX idx_site_configs_url_pattern ON public.site_configs(url_pattern);

-- Enable RLS on all tables
ALTER TABLE public.automation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on auth requirements later)
CREATE POLICY "Allow all operations on automation_sessions" 
ON public.automation_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on automation_logs" 
ON public.automation_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on site_configs" 
ON public.site_configs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps with proper security
CREATE OR REPLACE FUNCTION public.update_automation_updated_at()
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

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_automation_sessions_updated_at
BEFORE UPDATE ON public.automation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_automation_updated_at();

CREATE TRIGGER update_site_configs_updated_at
BEFORE UPDATE ON public.site_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_automation_updated_at();

-- Enable realtime for automation tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_logs;