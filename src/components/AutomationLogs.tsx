import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Log {
  id: string;
  action: string;
  details: string | null;
  success: boolean;
  created_at: string;
}

export const AutomationLogs = () => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    // Load initial logs
    loadLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('automation_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_logs',
        },
        (payload) => {
          setLogs((prev) => [payload.new as Log, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Logi Automatyzacji</h3>
        <p className="text-xs text-muted-foreground">
          {logs.length} zdarzeń
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Oczekiwanie na logi...</span>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  log.success
                    ? 'bg-secondary/50 border-border'
                    : 'bg-destructive/10 border-destructive/50'
                )}
              >
                {log.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.created_at).toLocaleTimeString('pl-PL')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};