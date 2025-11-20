import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Zap, Loader2 } from 'lucide-react';
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
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Nieprawidłowy email lub hasło');
          }
          throw error;
        }

        toast({
          title: 'Zalogowano!',
          description: 'Witaj ponownie w Tab4Storm',
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Ten email jest już zarejestrowany');
          }
          throw error;
        }

        toast({
          title: 'Konto utworzone!',
          description: 'Możesz się teraz zalogować. Masz 3 darmowe użycia!',
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Wystąpił błąd',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border shadow-card">
        <div className="flex flex-col items-center mb-8">
          <div className="mx-auto mb-4 w-28 h-28 bg-gradient-primary rounded-2xl shadow-glow flex items-center justify-center overflow-hidden">
  <img 
    src="/logo.png" 
    alt="Tab4Storm Logo"
    className="w-full h-full object-contain"
  />
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-secondary"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Proszę czekać...
              </>
            ) : (
              isLogin ? 'Zaloguj się' : 'Zarejestruj się'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isLogin
              ? 'Nie masz konta? Zarejestruj się'
              : 'Masz już konto? Zaloguj się'}
          </button>
        </div>

        {!isLogin && (
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-center text-muted-foreground">
              Nowe konto otrzymuje <span className="font-bold text-primary">3 darmowe użycia</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;