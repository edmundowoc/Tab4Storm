import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Pobierz tokeny z URL
    const access_token = searchParams.get("access_token");
    const refresh_token = searchParams.get("refresh_token");

    if (!access_token || !refresh_token) {
      toast({
        title: "Błąd",
        description: "Niepoprawny link resetujący.",
        variant: "destructive",
      });
      return;
    }

    // Ustaw sesję z linku mailowego
    supabase.auth
      .setSession({
        access_token,
        refresh_token,
      })
      .then(({ error }) => {
        if (error) {
          toast({
            title: "Błąd",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setReady(true);
        }
      });
  }, [searchParams, toast]);

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Hasło zmienione!",
      description: "Możesz teraz się zalogować.",
    });

    window.location.href = "/auth";
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-dark">
        <p className="text-white">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-dark">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Ustaw nowe hasło</h1>

        <Input
          type="password"
          placeholder="Nowe hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        <Button className="w-full" onClick={handleReset}>
          Zapisz nowe hasło
        </Button>
      </Card>
    </div>
  );
};

export default ResetPassword;

