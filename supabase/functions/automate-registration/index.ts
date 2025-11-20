import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate temp email using public API
async function generateTempEmail(): Promise<string> {
  try {
    // Try temp-mail.org API
    const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
    const emails = await response.json();
    if (emails && emails.length > 0) {
      console.log('Generated temp email:', emails[0]);
      return emails[0];
    }
  } catch (error) {
    console.error('Temp mail generation failed:', error);
  }
  
  // Fallback: generate random email
  const randomString = Math.random().toString(36).substring(7);
  return `user_${randomString}@tempmailgen.com`;
}

// Generate secure random password
function generatePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate birthdate for 19-34 year old person
function generateBirthdate(): string {
  const today = new Date();
  const minAge = 19;
  const maxAge = 34;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1; // Safe for all months
  
  return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
}

// Analyze page with AI to detect forms
async function analyzePageWithVision(htmlContent: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Limit HTML to prevent token overflow (50k chars)
  const truncatedHtml = htmlContent.substring(0, 50000);
  
  const prompt = `Analyze this HTML page and determine if it contains a registration/signup form.
Return a JSON object with this EXACT structure:
{
  "hasRegistrationForm": boolean,
  "confidence": number (0-100),
  "formDetails": {
    "emailField": "CSS selector for email input",
    "passwordField": "CSS selector for password input",
    "submitButton": "CSS selector for submit button",
    "endpoint": "form action URL or likely POST endpoint",
    "method": "POST or GET"
  },
  "patterns": ["list of detected patterns like 'signup', 'register', etc"]
}

Look for:
- Email input fields (type="email", name containing "email", "mail", "e-mail")
- Password input fields (type="password", name containing "password", "pass", "pwd")
- Submit buttons (type="submit", button with text like "Sign Up", "Register", "Join")
- Form actions or API endpoints
- Registration keywords: signup, register, join, create account, sign-up

Be liberal in detection - if you see ANY email + password fields, consider it a registration form.

HTML Content:
${truncatedHtml}`;

  console.log('Sending HTML to Vision AI (length:', truncatedHtml.length, ')');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert at analyzing HTML and detecting registration forms. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision AI failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const rawContent = data.choices[0].message.content as string;

  // Handle cases where the model wraps JSON in ```json ... ``` fences
  const cleanedContent = rawContent
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/i, '')
    .trim();

  console.log('Vision AI raw response:', rawContent);
  console.log('Vision AI cleaned JSON:', cleanedContent);

  try {
    const analysis = JSON.parse(cleanedContent);
    console.log('Vision AI analysis:', JSON.stringify(analysis, null, 2));
    return analysis;
  } catch (error) {
    console.error('Failed to parse Vision AI response:', error);
    throw new Error('Invalid JSON from Vision AI');
  }
}

// Fallback: Simple regex-based form detection
function simpleFormDetection(html: string): boolean {
  const hasEmail = /type\s*=\s*["']email["']|name\s*=\s*["'][^"']*(?:email|mail|e-mail)[^"']*["']/i.test(html);
  const hasPassword = /type\s*=\s*["']password["']|name\s*=\s*["'][^"']*(?:password|pass|pwd)[^"']*["']/i.test(html);
  
  console.log('Regex detection - hasEmail:', hasEmail, 'hasPassword:', hasPassword);
  return hasEmail && hasPassword;
}

// Detect JS redirects in HTML
function detectJSRedirect(html: string): string | null {
  const patterns = [
    /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    /window\.location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
    /location\.href\s*=\s*["']([^"']+)["']/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('Detected JS redirect to:', match[1]);
      return match[1];
    }
  }
  return null;
}

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
    const { url, sessionId } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting automation for URL:', url, 'Session:', sessionId, 'User:', userId);

    // CRITICAL SECURITY: Check usage limits before proceeding
    const FREE_LIMIT = 3;
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('usage_count, has_paid')
      .eq('user_id', userId)
      .single();

    if (usageError || !usage) {
      throw new Error('Failed to fetch usage data');
    }

    const canUse = usage.has_paid || usage.usage_count < FREE_LIMIT;
    
    if (!canUse) {
      await supabase.from('automation_sessions').update({
        status: 'failed',
        error: 'Usage limit exceeded - Premium required',
        completed_at: new Date().toISOString(),
      }).eq('id', sessionId);

      await supabase.from('automation_logs').insert({
        session_id: sessionId,
        action: 'usage_check',
        details: 'Usage limit exceeded - Premium required',
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usage limit exceeded',
          message: 'Wykorzystano wszystkie darmowe użycia. Kup dostęp Premium.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Usage check passed:', { usage_count: usage.usage_count, has_paid: usage.has_paid });

    // Validate URL to prevent SSRF
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // Log: Starting
    await supabase.from('automation_logs').insert({
      session_id: sessionId,
      action: 'fetch_page',
      details: `Fetching page: ${url}`,
      success: true,
    });

    // Fetch the page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }

    let htmlContent = await pageResponse.text();
    console.log('Fetched HTML length:', htmlContent.length);

    // Check for JS redirect and follow it
    const jsRedirect = detectJSRedirect(htmlContent);
    if (jsRedirect) {
      await supabase.from('automation_logs').insert({
        session_id: sessionId,
        action: 'redirect_detected',
        details: `Following redirect to: ${jsRedirect}`,
        success: true,
      });
      
      const redirectUrl = new URL(jsRedirect, url).toString();
      const redirectResponse = await fetch(redirectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (redirectResponse.ok) {
        htmlContent = await redirectResponse.text();
        console.log('Fetched redirected HTML length:', htmlContent.length);
      }
    }

    // Analyze with Vision AI
    await supabase.from('automation_logs').insert({
      session_id: sessionId,
      action: 'analyze_page',
      details: 'Analyzing page with AI...',
      success: true,
    });

    const analysis = await analyzePageWithVision(htmlContent);

    // Fallback regex detection if AI confidence is low
    if (!analysis.hasRegistrationForm || analysis.confidence < 50) {
      console.log('AI detection failed or low confidence, trying regex fallback...');
      const regexDetected = simpleFormDetection(htmlContent);
      
      if (!regexDetected) {
        // Generate credentials anyway and save for manual use
        const email = await generateTempEmail();
        const password = generatePassword();
        const siteName = new URL(url).hostname;

        // Encrypt password before saving
        const { data: encryptedPassword, error: encryptError } = await supabase
          .rpc('encrypt_password', { password_text: password });
        
        if (encryptError) throw new Error('Failed to encrypt password');

        // Save credentials to database for manual registration
        await supabase.from('saved_credentials').insert({
          user_id: userId,
          url: url,
          email: email,
          password: encryptedPassword,
          site_name: siteName,
          successfully_registered: false,
          manual_needed: true,
        });

        await supabase.from('automation_sessions').update({
          status: 'failed',
          error: 'No registration form detected - credentials saved for manual use',
          completed_at: new Date().toISOString(),
        }).eq('id', sessionId);

        await supabase.from('automation_logs').insert({
          session_id: sessionId,
          action: 'form_detection',
          details: 'No registration form found - credentials generated and saved for manual registration',
          success: false,
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No registration form detected',
            message: 'Credentials saved for manual use - check "Moje Dane Logowania"',
            credentialsSaved: true,
            email,
            htmlLength: htmlContent.length,
            aiConfidence: analysis.confidence,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Regex fallback detected a form!');
      analysis.hasRegistrationForm = true;
      analysis.confidence = 60;
    }

    // Generate credentials
    const email = await generateTempEmail();
    const password = generatePassword();
    const birthdate = generateBirthdate();

    await supabase.from('automation_logs').insert({
      session_id: sessionId,
      action: 'generate_credentials',
      details: `Generated email: ${email}`,
      success: true,
    });

    // Try to submit the form
    await supabase.from('automation_logs').insert({
      session_id: sessionId,
      action: 'submit_form',
      details: `Submitting to endpoint: ${analysis.formDetails?.endpoint || url}`,
      success: true,
    });

    // Construct form data
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('birthdate', birthdate);

    // Try POST to detected endpoint
    const submitUrl = analysis.formDetails?.endpoint 
      ? new URL(analysis.formDetails.endpoint, url).toString()
      : url;

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: formData,
      redirect: 'manual',
    });

    const submitSuccess = submitResponse.status === 200 || submitResponse.status === 302;

    await supabase.from('automation_logs').insert({
      session_id: sessionId,
      action: 'form_submitted',
      details: `Response status: ${submitResponse.status}`,
      success: submitSuccess,
    });

    await supabase.from('automation_sessions').update({
      status: submitSuccess ? 'completed' : 'failed',
      error: submitSuccess ? null : `HTTP ${submitResponse.status}`,
      completed_at: new Date().toISOString(),
    }).eq('id', sessionId);

    return new Response(
      JSON.stringify({ 
        success: submitSuccess,
        email,
        status: submitResponse.status,
        aiConfidence: analysis.confidence,
        patterns: analysis.patterns,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Automation error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});