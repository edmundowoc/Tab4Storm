import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Nieprawidłowy adres email');
const passwordSchema = z.string().min(6, 'Hasło musi mieć minimum 6 znaków');

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Błąd walidacji',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Nieprawidłowy email lub hasło");
        toast({ title: 'Zalogowano!', description: 'Witaj ponownie w Tab4Storm' });
      } else {
        const redirectUrl = `${window.location.origin}/auth`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });

        if (error) throw error;

        toast({
          title: 'Konto utworzone!',
          description: 'Sprawdź maila i kliknij link aktywacyjny!',
        });

        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Wystąpił błąd',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-transparent border-border shadow-card">
        <div className="flex flex-col items-center mb-8">
          <div className="mx-auto mb-4 w-28 h-28 rounded-2xl flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Tab4Storm Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Tab4Storm
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? 'Zaloguj się do swojego konta' : 'Utwórz nowe konto'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="twoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label>Hasło</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="bg-secondary"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proszę czekać...</> :
            isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </Button>
        </form>

        {/* Sekcja pod formularzem */}
        <div className="mt-6 text-center">

          {/* Przełącznik Login/Register */}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
          </button>

          {/* RESET HASŁA */}
          {isLogin && (
            <button
              type="button"
              onClick={async () => {
                if (!email) {
                  toast({
                    title: "Podaj email",
                    description: "Wpisz swój email przed resetem hasła.",
                    variant: "destructive",
                  });
                  return;
                }

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset`,
                });

                if (error) {
                  toast({ title: "Błąd", description: error.message, variant: "destructive" });
                } else {
                  toast({
                    title: "Email wysłany!",
                    description: "Sprawdź skrzynkę i kliknij link resetujący.",
                  });
                }
              }}
              className="text-xs text-primary hover:underline block mt-2"
            >
              Zapomniałeś hasła?
            </button>
          )}

          {/* Logowanie Google */}
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/` },
              });
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-white text-black rounded-md border hover:bg-gray-100 transition"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
            Kontynuuj z Google
          </button>

        </div>
      </Card>
    </div>
  );
};

export default Auth;
