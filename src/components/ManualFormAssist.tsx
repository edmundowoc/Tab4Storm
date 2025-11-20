import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, Code2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ManualFormAssistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnalysisResult {
  emailField: string;
  passwordField: string;
  submitButton: string;
  formAction: string | null;
  confidence: number;
}

interface Credentials {
  email: string;
  password: string;
  credentialId: string;
}

export const ManualFormAssist = ({ open, onOpenChange }: ManualFormAssistProps) => {
  const { toast } = useToast();
  const [htmlCode, setHtmlCode] = useState("");
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const handleAnalyze = async () => {
    if (!htmlCode.trim()) {
      toast({
        title: "Błąd",
        description: "Wklej kod HTML formularza",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Użytkownik nie jest zalogowany");
      }

      const { data, error } = await supabase.functions.invoke('analyze-manual-form', {
        body: {
          htmlCode,
          url: url || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        setCredentials(data.credentials);
        toast({
          title: "Sukces!",
          description: "Formularz przeanalizowany i dane wygenerowane",
        });
      } else {
        throw new Error(data.error || "Nie udało się przeanalizować");
      }
    } catch (error) {
      console.error('Error analyzing form:', error);
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Nie udało się przeanalizować formularza",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Skopiowano!",
      description: `${label} skopiowano do schowka`,
    });
  };

  const handleClose = () => {
    setHtmlCode("");
    setUrl("");
    setAnalysis(null);
    setCredentials(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Tryb Manualny - Analiza HTML
          </DialogTitle>
          <DialogDescription>
            Wklej kod HTML formularza rejestracyjnego. System przeanalizuje go i wygeneruje dane logowania.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              URL strony (opcjonalnie)
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Kod HTML formularza
            </label>
            <Textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="Wklej tutaj kod HTML formularza (np. skopiowany przez F12 → Elements → Copy element)"
              className="min-h-[200px] font-mono text-xs"
            />
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !htmlCode.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizuję...
              </>
            ) : (
              "Analizuj i Generuj Dane"
            )}
          </Button>

          {analysis && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Wykryte pola formularza
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Pole email:</span>
                  <code className="ml-2 bg-background px-2 py-1 rounded">{analysis.emailField}</code>
                </div>
                <div>
                  <span className="font-medium">Pole hasło:</span>
                  <code className="ml-2 bg-background px-2 py-1 rounded">{analysis.passwordField}</code>
                </div>
                <div>
                  <span className="font-medium">Przycisk submit:</span>
                  <code className="ml-2 bg-background px-2 py-1 rounded">{analysis.submitButton}</code>
                </div>
                {analysis.formAction && (
                  <div>
                    <span className="font-medium">Action:</span>
                    <code className="ml-2 bg-background px-2 py-1 rounded text-xs break-all">{analysis.formAction}</code>
                  </div>
                )}
                <div>
                  <span className="font-medium">Pewność:</span>
                  <span className="ml-2">{analysis.confidence}%</span>
                </div>
              </div>
            </div>
          )}

          {credentials && (
            <div className="border rounded-lg p-4 space-y-3 bg-primary/5">
              <h3 className="font-semibold text-primary">
                🎉 Wygenerowane dane logowania
              </h3>
              <p className="text-sm text-muted-foreground">
                Dane zostały zapisane w Twojej bibliotece. Użyj ich do ręcznej rejestracji.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                    <code className="block bg-background px-3 py-2 rounded border text-sm">
                      {credentials.email}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.email, "Email")}
                    className="mt-6"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Hasło</label>
                    <code className="block bg-background px-3 py-2 rounded border text-sm">
                      {credentials.password}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.password, "Hasło")}
                    className="mt-6"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};