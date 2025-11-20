import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Hasło zmienione!",
      description: "Możesz zalogować się nowym hasłem.",
    });

    window.location.href = "/auth";
  };

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
