import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { htmlCode, url } = await req.json();

    if (!htmlCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing HTML for user:', userId, 'URL:', url);

    // Initialize Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Analyze HTML with Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisPrompt = `Analyze this HTML form code and identify registration form fields. Return ONLY a JSON object (no markdown, no code blocks) with this exact structure:
{
  "emailField": "CSS selector for email input",
  "passwordField": "CSS selector for password input",
  "submitButton": "CSS selector for submit button",
  "formAction": "form action URL or null",
  "confidence": number between 0-100
}

HTML Code:
${htmlCode}`;

    console.log('Calling Lovable AI for HTML analysis');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing HTML forms. Return only valid JSON without any markdown formatting.' },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to analyze HTML with AI');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    console.log('AI analysis response:', analysisText);

    // Parse the analysis result
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Invalid analysis format from AI');
    }

    // Generate temp email using 1secmail.com API
    console.log('Generating temporary email');
    let tempEmail: string;
    try {
      const emailResponse = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
      const emailData = await emailResponse.json();
      tempEmail = emailData[0];
      console.log('Generated temp email:', tempEmail);
    } catch (emailError) {
      console.error('Failed to generate temp email, using fallback');
      const randomString = Math.random().toString(36).substring(2, 10);
      tempEmail = `temp${randomString}@1secmail.com`;
    }

    // Generate secure password
    const generatePassword = () => {
      const length = 16;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    const password = generatePassword();
    console.log('Generated password');

    // Encrypt password before saving
    const { data: encryptedPassword, error: encryptError } = await supabase
      .rpc('encrypt_password', { password_text: password });
    
    if (encryptError) {
      console.error('Error encrypting password:', encryptError);
      throw new Error('Failed to encrypt password');
    }

    // Save credentials to database
    const siteName = url ? new URL(url).hostname : 'Unknown';
    const { data: credentialData, error: insertError } = await supabase
      .from('saved_credentials')
      .insert({
        user_id: userId,
        url: url || 'manual-input',
        email: tempEmail,
        password: encryptedPassword,
        site_name: siteName,
        successfully_registered: false,
        manual_needed: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving credentials:', insertError);
      throw new Error('Failed to save credentials');
    }

    console.log('Credentials saved successfully:', credentialData.id);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          emailField: analysis.emailField,
          passwordField: analysis.passwordField,
          submitButton: analysis.submitButton,
          formAction: analysis.formAction,
          confidence: analysis.confidence
        },
        credentials: {
          email: tempEmail,
          password: password,
          credentialId: credentialData.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-manual-form:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});