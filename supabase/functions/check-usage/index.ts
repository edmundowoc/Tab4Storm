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

    // ---- AUTH ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabaseClient.auth.getUser(jwt);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { repeatCount = 1 } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- GET USAGE ----
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!usage) {
      return new Response(JSON.stringify({
        allowed: false,
        message: "Brak wpisu w user_usage"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- PREMIUM: unlimited ----
    if (usage.has_paid === true) {
      return new Response(JSON.stringify({
        allowed: true,
        message: "Premium user – unlimited access",
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- FREE USERS ----
    const newUsage = usage.usage_count + repeatCount;

    if (newUsage > FREE_LIMIT) {
      return new Response(JSON.stringify({
        allowed: false,
        message: "Limit darmowych użyć przekroczony",
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // update usage for free users only
    await supabase
      .from('user_usage')
      .update({
        usage_count: newUsage,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      allowed: true,
      message: "OK",
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({
      allowed: true,  // <-- PREMIUM NIE MOŻE SIĘ BLOKOWAĆ NA BŁĘDZIE
      error: e.message,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
