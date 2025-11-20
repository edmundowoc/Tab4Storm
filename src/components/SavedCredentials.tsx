import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Credential {
  id: string;
  url: string;
  email: string;
  password: string;
  site_name: string | null;
  notes: string | null;
  created_at: string;
  successfully_registered: boolean;
  manual_needed: boolean;
}

export const SavedCredentials = () => {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [filterUrl, setFilterUrl] = useState("");

  useEffect(() => {
    loadCredentials();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('saved_credentials_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_credentials'
        },
        () => {
          loadCredentials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Skopiowano!",
      description: `${label} skopiowano do schowka`,
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const deleteCredential = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Usunięto",
        description: "Dane logowania zostały usunięte",
      });
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć danych",
        variant: "destructive",
      });
    }
  };

  const filteredCredentials = credentials.filter(cred => 
    !filterUrl || cred.url.toLowerCase().includes(filterUrl.toLowerCase()) ||
    (cred.site_name && cred.site_name.toLowerCase().includes(filterUrl.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Moje Dane Logowania</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Zapisane dane do rejestracji na stronach
        </p>
        <Input
          placeholder="Filtruj po URL lub nazwie strony..."
          value={filterUrl}
          onChange={(e) => setFilterUrl(e.target.value)}
          className="mb-4"
        />
      </div>

      {filteredCredentials.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          {filterUrl ? "Brak wyników dla tego filtra" : "Brak zapisanych danych logowania"}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCredentials.map((cred) => (
            <Card key={cred.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium flex items-center gap-2">
                      {cred.site_name || "Strona"}
                      {cred.manual_needed && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                          Wymaga ręcznej rejestracji
                        </span>
                      )}
                      {cred.successfully_registered && (
                        <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                          ✓ Zarejestrowano
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <a 
                        href={cred.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        {cred.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Utworzono: {new Date(cred.created_at).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCredential(cred.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Email</label>
                      <code className="block bg-muted px-3 py-2 rounded text-sm">
                        {cred.email}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(cred.email, "Email")}
                      className="mt-5"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Hasło</label>
                      <code className="block bg-muted px-3 py-2 rounded text-sm">
                        {visiblePasswords.has(cred.id) ? cred.password : '••••••••••••'}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePasswordVisibility(cred.id)}
                      className="mt-5"
                    >
                      {visiblePasswords.has(cred.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(cred.password, "Hasło")}
                      className="mt-5"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {cred.notes && (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Notatki</label>
                      <p className="text-sm bg-muted px-3 py-2 rounded">{cred.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};