import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FREE_LIMIT = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use authenticated user's ID instead of accepting from request body
    const userId = user.id;
    const { repeatCount } = await req.json();

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user usage
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('usage_count, has_paid')
      .eq('user_id', userId)
      .single();

    if (usageError || !usage) {
      throw new Error('Failed to fetch usage data');
    }

    const canUse = usage.has_paid || usage.usage_count < FREE_LIMIT;
    const usageLeft = usage.has_paid ? Infinity : Math.max(0, FREE_LIMIT - usage.usage_count);

    if (!canUse) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'usage_limit_exceeded',
          message: 'Wykorzystano wszystkie darmowe użycia. Kup dostęp Premium.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Increment usage count
    const newUsageCount = usage.usage_count + repeatCount;
    
    await supabase
      .from('user_usage')
      .update({
        usage_count: newUsageCount,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        allowed: true,
        usage: {
          count: newUsageCount,
          limit: FREE_LIMIT,
          has_paid: usage.has_paid,
          usageLeft: usage.has_paid ? Infinity : Math.max(0, FREE_LIMIT - newUsageCount),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check usage error:', error);
    return new Response(
      JSON.stringify({
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});