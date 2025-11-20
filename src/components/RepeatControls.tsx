import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Clock } from 'lucide-react';

interface RepeatControlsProps {
  repeatCount: number;
  onRepeatCountChange: (count: number) => void;
  delaySeconds: number;
  onDelayChange: (seconds: number) => void;
  disabled?: boolean;
}

export const RepeatControls = ({
  repeatCount,
  onRepeatCountChange,
  delaySeconds,
  onDelayChange,
  disabled,
}: RepeatControlsProps) => {
  return (
    <div className="space-y-4 p-6 bg-card rounded-lg shadow-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Kontrola powtórzeń</h3>
      </div>

      {/* Repeat Count */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Liczba powtórzeń
          </Label>
          <span className="text-sm font-bold text-primary">
            {repeatCount}x
          </span>
        </div>
        <Slider
          value={[repeatCount]}
          onValueChange={(values) => onRepeatCountChange(values[0])}
          min={1}
          max={25}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Automatyzacja uruchomi się {repeatCount} {repeatCount === 1 ? 'raz' : 'razy'}
        </p>
      </div>

      {/* Duration of Each Repeat */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Czas trwania
          </Label>
          <span className="text-sm font-bold text-accent">
            {delaySeconds}s
          </span>
        </div>
        <Slider
          value={[delaySeconds]}
          onValueChange={(values) => onDelayChange(values[0])}
          min={5}
          max={120}
          step={5}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Każde powtórzenie trwa {delaySeconds} sekund
        </p>
      </div>
    </div>
  );
};