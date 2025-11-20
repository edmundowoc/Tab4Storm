import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const ProxyConfig = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Konfiguracja zapisana',
      description: 'Ustawienia proxy zostały zaktualizowane.',
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Konfiguracja Proxy</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 p-4 bg-card rounded-lg border border-border">
        <div className="space-y-2">
          <Label htmlFor="proxy-url">URL Proxy</Label>
          <Input
            id="proxy-url"
            type="text"
            placeholder="http://proxy.example.com:8080"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            className="bg-secondary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proxy-username">Użytkownik</Label>
            <Input
              id="proxy-username"
              type="text"
              placeholder="username"
              value={proxyUsername}
              onChange={(e) => setProxyUsername(e.target.value)}
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy-password">Hasło</Label>
            <Input
              id="proxy-password"
              type="password"
              placeholder="••••••••"
              value={proxyPassword}
              onChange={(e) => setProxyPassword(e.target.value)}
              className="bg-secondary"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Zapisz konfigurację
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};