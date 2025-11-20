import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Grid3x3, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabManagerProps {
  urls: string[];
  onClose: (index: number) => void;
  onCloseAll: () => void;
}

interface IframeState {
  loading: boolean;
  error: boolean;
}

export const TabManager = ({ urls, onClose, onCloseAll }: TabManagerProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');
  const [iframeStates, setIframeStates] = useState<Record<number, IframeState>>({});

  useEffect(() => {
    if (urls.length === 0) {
      setActiveTab(0);
      setIframeStates({});
    } else if (activeTab >= urls.length) {
      setActiveTab(urls.length - 1);
    }
    // Auto-switch to grid mode when multiple URLs are loaded
    if (urls.length > 1) {
      setViewMode('grid');
    }
    // Initialize loading states for new URLs
    const newStates: Record<number, IframeState> = {};
    urls.forEach((_, index) => {
      if (!iframeStates[index]) {
        newStates[index] = { loading: true, error: false };
      }
    });
    if (Object.keys(newStates).length > 0) {
      setIframeStates(prev => ({ ...prev, ...newStates }));
    }
  }, [urls.length, activeTab]);

  const handleIframeLoad = (index: number) => {
    setIframeStates(prev => ({
      ...prev,
      [index]: { loading: false, error: false }
    }));
  };

  const handleIframeError = (index: number) => {
    setIframeStates(prev => ({
      ...prev,
      [index]: { loading: false, error: true }
    }));
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (urls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">
          Brak otwartych zakładek
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* View Controls */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('single')}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Pojedyncza
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Wszystkie
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onCloseAll}
        >
          Zamknij wszystkie
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'single' ? (
          <div className="h-full relative">
            {iframeStates[activeTab]?.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Ładowanie strony...</p>
                </div>
              </div>
            )}
            {iframeStates[activeTab]?.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <div className="text-center space-y-3 p-6">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                  <p className="text-sm font-medium">Nie można załadować strony w iframe</p>
                  <p className="text-xs text-muted-foreground">Strona blokuje wyświetlanie w iframe (X-Frame-Options)</p>
                  <Button onClick={() => openInNewTab(urls[activeTab])} variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Otwórz w nowej karcie
                  </Button>
                </div>
              </div>
            )}
            <iframe
              src={urls[activeTab]}
              className="w-full h-full border border-border rounded-lg bg-background"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              title={`Tab ${activeTab + 1}`}
              onLoad={() => handleIframeLoad(activeTab)}
              onError={() => handleIframeError(activeTab)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urls.map((url, index) => (
              <div
                key={index}
                className="relative group"
              >
                <div className="relative">
                  {iframeStates[index]?.loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card z-10 rounded-lg border border-border">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground">Ładowanie...</p>
                      </div>
                    </div>
                  )}
                  {iframeStates[index]?.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card z-10 rounded-lg border border-border">
                      <div className="text-center space-y-2 p-4">
                        <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                        <p className="text-xs font-medium">Strona zablokowana</p>
                        <Button onClick={() => openInNewTab(url)} variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Otwórz
                        </Button>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={url}
                    className="w-full h-[350px] border border-border rounded-lg bg-background"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    title={`Tab ${index + 1}`}
                    onLoad={() => handleIframeLoad(index)}
                    onError={() => handleIframeError(index)}
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onClose(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Bar (Bottom) */}
      <div className="flex items-center gap-2 p-4 bg-card border-t border-border overflow-x-auto">
        {urls.map((url, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveTab(index);
              if (viewMode === 'grid') setViewMode('single');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap',
              'border border-border',
              activeTab === index && viewMode === 'single'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            )}
          >
            <span className="text-sm font-medium">
              Zakładka {index + 1}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(index);
              }}
              className="hover:bg-destructive/20 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};