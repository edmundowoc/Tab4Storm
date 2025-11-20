import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UrlInput } from '@/components/UrlInput';
import { TabManager } from '@/components/TabManager';
import { AutomationToggle } from '@/components/AutomationToggle';
import { AutomationLogs } from '@/components/AutomationLogs';
import { ProxyConfig } from '@/components/ProxyConfig';
import { RepeatControls } from '@/components/RepeatControls';
import { UsageDisplay } from '@/components/UsageDisplay';
import { UserMenu } from '@/components/UserMenu';
import { ManualFormAssist } from '@/components/ManualFormAssist';
import { SavedCredentials } from '@/components/SavedCredentials';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Zap } from 'lucide-react';
import type { User, Session } from '@supabase/supabase-js';

const Index = () => {
const buyPremium = async () => {
  try {
    const res = await fetch("/api/create-checkout-session");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error("Stripe error:", error);
  }
};

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [manualModeOpen, setManualModeOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth');
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth');
      }
    });

    // Check payment status
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({
        title: 'Płatność zakończona!',
        description: 'Teraz masz nieograniczony dostęp do automatyzacji.',
      });
      // Clean URL
      window.history.replaceState({}, '', '/');
    } else if (payment === 'cancelled') {
      toast({
        title: 'Płatność anulowana',
        description: 'Możesz spróbować ponownie później.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, toast]);

  const handleStart = async (urls: string[], count: number) => {
    if (!user) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany',
        variant: 'destructive',
      });
      return;
    }

    // Check usage limits
    const { data: usageCheck, error: usageError } = await supabase.functions.invoke('check-usage', {
      body: { userId: user.id, repeatCount },
    });

    if (usageError || !usageCheck?.allowed) {
      toast({
        title: 'Limit użycia',
        description: usageCheck?.message || 'Nie możesz użyć automatyzacji',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);

    // Run automation with repeats
    for (let repeat = 0; repeat < repeatCount; repeat++) {
      toast({
        title: `Powtórzenie ${repeat + 1}/${repeatCount}`,
        description: `Uruchamiam automatyzację dla ${urls.length} ${urls.length === 1 ? 'linka' : 'linków'}...`,
      });

      // Create all URLs for all links
      const allUrls: string[] = [];
      urls.forEach(url => {
        for (let i = 0; i < count; i++) {
          allUrls.push(url);
        }
      });
      
      setUrls(allUrls);

      // If automation is enabled, trigger it for each URL
      if (automationEnabled) {
        // Process each unique URL
        for (const url of urls) {
          for (let i = 0; i < count; i++) {
            try {
              const { data: sessionData } = await supabase
                .from('automation_sessions')
                .insert({
                  url,
                  status: 'pending',
                  user_id: user.id,
                })
                .select()
                .single();

              if (sessionData) {
                const { data: automationResult, error } = await supabase.functions.invoke('automate-registration', {
                  body: { url, sessionId: sessionData.id },
                });

                if (error) {
                  console.error('Automation error:', error);
                } else if (automationResult?.credentialsSaved) {
                  // Show toast about saved credentials
                  toast({
                    title: 'Automatyzacja nie powiodła się',
                    description: 'Dane logowania zostały zapisane - użyj trybu manualnego lub sprawdź "Moje Dane Logowania"',
                    variant: 'default',
                  });
                }
              }
            } catch (error) {
              console.error('Failed to start automation:', error);
            }

            if (i < count - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      }

  // Keep tabs open for the specified duration
  if (delaySeconds > 0) {
    toast({
      title: 'Powtórzenie aktywne',
      description: `Karty będą otwarte przez ${delaySeconds} sekund...`,
    });
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
  }

  // Close all tabs after this repeat (if not last iteration)
  if (repeat < repeatCount - 1) {
    setUrls([]);
    toast({
      title: 'Następne powtórzenie',
      description: `Przechodzę do powtórzenia ${repeat + 2}/${repeatCount}...`,
    });
    // Small delay before next repeat
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

    toast({
      title: 'Zakończono!',
      description: `Wykonano ${repeatCount} powtórzeń`,
    });
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setUrls([]);
    toast({
      title: 'Zatrzymano',
      description: 'Wszystkie zakładki zostały zamknięte',
    });
  };

  const handleCloseTab = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloseAll = () => {
    setUrls([]);
    setIsRunning(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-glow w-14 h-14 flex items-center justify-center overflow-hidden">
              <img 
               src="/logo.png" 
               alt="Tab4Storm Logo" 
               className="w-full h-full object-contain rounded-xl"

              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Tab4Storm Multiplier
              </h1>
              <p className="text-sm text-muted-foreground">
                Otwieraj wiele stron z automatyczną rejestracją AI
              </p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
<button 
  onClick={buyPremium}
  className="w-full py-2 px-4 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg font-medium transition-colors"
>
  🔥 Kup Premium – Odblokuj pełny dostęp
</button>

          <UsageDisplay />

          <UrlInput
            onStart={handleStart}
            onStop={handleStop}
            isRunning={isRunning}
          />

          <RepeatControls
            repeatCount={repeatCount}
            onRepeatCountChange={setRepeatCount}
            delaySeconds={delaySeconds}
            onDelayChange={setDelaySeconds}
            disabled={isRunning}
          />

          <AutomationToggle
            enabled={automationEnabled}
            onChange={setAutomationEnabled}
            disabled={isRunning}
          />

          <div className="card-glass p-4">
            <button
              onClick={() => setManualModeOpen(true)}
              className="w-full py-2 px-4 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg font-medium transition-colors"
            >
              🛠️ Tryb Manualny
            </button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Dla trudnych stron - wklej kod HTML
            </p>
          </div>

          <ProxyConfig />

          <div className="card-glass p-4 max-h-[300px] overflow-y-auto">
            <SavedCredentials />
          </div>

          <div className="flex-1">
            <AutomationLogs />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col bg-card/50 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
          <TabManager
            urls={urls}
            onClose={handleCloseTab}
            onCloseAll={handleCloseAll}
          />
        </div>
      </div>

      <ManualFormAssist 
        open={manualModeOpen} 
        onOpenChange={setManualModeOpen}
      />
    </div>
  );
};

export default Index;