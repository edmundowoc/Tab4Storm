import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot } from 'lucide-react';

interface AutomationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export const AutomationToggle = ({ enabled, onChange, disabled }: AutomationToggleProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <Label htmlFor="automation" className="text-sm font-medium cursor-pointer">
            Automatyzacja AI
          </Label>
          <p className="text-xs text-muted-foreground">
            AI wypełni formularze automatycznie
          </p>
        </div>
      </div>
      <Switch
        id="automation"
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};