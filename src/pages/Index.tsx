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

  // 🔥 JEDYNY POPRAWNY useEffect
  useEffect(() => {
    // 1. Realtime login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // 2. Sprawdź istniejącą sesję po wejściu na stronę
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // 3. Obsługa Stripe
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({
        title: 'Płatność zakończona!',
        description: 'Teraz masz nieograniczony dostęp.',
      });
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
  }, []);

  // Jeśli nie ma usera → czekamy, NIE redirectujemy
  if (!user) return null;

  const handleStart = async (urls: string[], count: number) => {
    const { data: usageCheck } = await supabase.functions.invoke("check-usage", {
      body: { userId: user.id, repeatCount },
    });

    if (!usageCheck?.allowed) {
      toast({
        title: "Limit użycia",
        description: usageCheck?.message,
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);

    for (let repeat = 0; repeat < repeatCount; repeat++) {
      // Sub-URLs
      const allUrls: string[] = [];
      urls.forEach(url => {
        for (let i = 0; i < count; i++) allUrls.push(url);
      });

      setUrls(allUrls);

      if (automationEnabled) {
        for (const url of urls) {
          for (let i = 0; i < count; i++) {
            const { data: sessionData } = await supabase
              .from("automation_sessions")
              .insert({
                url,
                status: "pending",
                user_id: user.id,
              })
              .select()
              .single();

            if (sessionData) {
              await supabase.functions.invoke("automate-registration", {
                body: { url, sessionId: sessionData.id },
              });
            }
          }
        }
      }

      if (delaySeconds > 0) {
        await new Promise(r => setTimeout(r, delaySeconds * 1000));
      }

      if (repeat < repeatCount - 1) {
        setUrls([]);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setIsRunning(false);
    toast({
      title: "Zakończono!",
      description: `Wykonano ${repeatCount} powtórzeń.`,
    });
  };

  const handleStop = () => {
    setUrls([]);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      <header className="p-6 border-b border-border bg-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-12 h-12" alt="Tab4Storm" />
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Tab4Storm Multiplier
            </h1>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          <button
            onClick={buyPremium}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium"
          >
            🔥 Kup Premium – Odblokuj pełny dostęp
          </button>

          <UsageDisplay />

          <UrlInput onStart={handleStart} onStop={handleStop} isRunning={isRunning} />

          <RepeatControls
            repeatCount={repeatCount}
            onRepeatCountChange={setRepeatCount}
            delaySeconds={delaySeconds}
            onDelayChange={setDelaySeconds}
          />

          <AutomationToggle enabled={automationEnabled} onChange={setAutomationEnabled} />

          <ProxyConfig />
          <SavedCredentials />
          <AutomationLogs />
        </div>

        <div className="flex-1 flex flex-col bg-card/50 backdrop-blur-sm rounded-lg border">
          <TabManager urls={urls} onClose={() => {}} onCloseAll={() => {}} />
        </div>
      </div>

      <ManualFormAssist open={manualModeOpen} onOpenChange={setManualModeOpen} />
    </div>
  );
};

export default Index;
