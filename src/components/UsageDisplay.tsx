import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface UserUsage {
  usage_count: number;
  has_paid: boolean;
}

const FREE_LIMIT = 3;

export const UsageDisplay = () => {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsage();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_usage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_usage',
        },
        () => {
          loadUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_usage')
      .select('usage_count, has_paid')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUsage(data);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call Stripe edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {}
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Błąd płatności',
        description: 'Nie udało się rozpocząć płatności',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!usage) return null;

  const usageLeft = usage.has_paid ? Infinity : Math.max(0, FREE_LIMIT - usage.usage_count);
  const usagePercent = usage.has_paid ? 100 : (usage.usage_count / FREE_LIMIT) * 100;
  const canUse = usage.has_paid || usage.usage_count < FREE_LIMIT;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Status konta</h3>
          {usage.has_paid ? (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>Premium</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <span>Darmowy</span>
            </div>
          )}
        </div>

        {!usage.has_paid && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pozostałe użycia</span>
                <span className="font-bold text-primary">
                  {usageLeft} / {FREE_LIMIT}
                </span>
              </div>
              <Progress value={100 - usagePercent} className="h-2" />
            </div>

            {!canUse && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs text-destructive font-medium">
                  Wykorzystano wszystkie darmowe użycia
                </p>
              </div>
            )}

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full"
              variant={canUse ? 'outline' : 'default'}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {loading ? 'Ładowanie...' : 'Kup dostęp Premium'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Premium = nieograniczone użycie
            </p>
          </>
        )}

        {usage.has_paid && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-center text-primary font-medium">
              🎉 Masz nieograniczony dostęp!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};