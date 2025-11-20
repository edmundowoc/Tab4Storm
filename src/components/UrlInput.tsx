import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, StopCircle, Link as LinkIcon } from 'lucide-react';

interface UrlInputProps {
  onStart: (urls: string[], count: number) => void;
  onStop: () => void;
  isRunning: boolean;
}

export const UrlInput = ({ onStart, onStop, isRunning }: UrlInputProps) => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [url3, setUrl3] = useState('');
  const [count, setCount] = useState(1);

  const handleStart = () => {
    // Collect all non-empty URLs
    const urls = [url1, url2, url3].filter(url => url.trim() !== '');
    
    if (urls.length > 0 && count >= 1 && count <= 100) {
      onStart(urls, count);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg shadow-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Konfiguracja URL</h3>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="url1" className="text-sm font-medium">
            Link 1
          </Label>
          <Input
            id="url1"
            type="url"
            placeholder="https://example.com"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            className="bg-secondary border-border"
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url2" className="text-sm font-medium">
            Link 2 (opcjonalnie)
          </Label>
          <Input
            id="url2"
            type="url"
            placeholder="https://example2.com"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            className="bg-secondary border-border"
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url3" className="text-sm font-medium">
            Link 3 (opcjonalnie)
          </Label>
          <Input
            id="url3"
            type="url"
            placeholder="https://example3.com"
            value={url3}
            onChange={(e) => setUrl3(e.target.value)}
            className="bg-secondary border-border"
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Liczba zakładek na każdy URL
          </Label>
          <span className="text-sm font-bold text-primary">
            {count}
          </span>
        </div>
        <Slider
          value={[count]}
          onValueChange={(values) => setCount(values[0])}
          min={1}
          max={100}
          step={1}
          disabled={isRunning}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Każdy link zostanie otwarty {count} {count === 1 ? 'raz' : 'razy'}
        </p>
      </div>

      <Button
        onClick={isRunning ? onStop : handleStart}
        disabled={!url1.trim() && !url2.trim() && !url3.trim() && !isRunning}
        className="w-full"
        variant={isRunning ? "destructive" : "default"}
      >
        {isRunning ? (
          <>
            <StopCircle className="mr-2 h-4 w-4" />
            Zatrzymaj
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Uruchom ({[url1, url2, url3].filter(u => u.trim()).length} {[url1, url2, url3].filter(u => u.trim()).length === 1 ? 'link' : 'linki'})
          </>
        )}
      </Button>
    </div>
  );
};