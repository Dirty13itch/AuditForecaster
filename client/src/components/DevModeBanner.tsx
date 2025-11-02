import { useState, useEffect } from 'react';
import { AlertTriangle, User, Beaker, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getRuntimeEnv } from '@shared/gatekeeping';

export function DevModeBanner() {
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const [showExperimental, setShowExperimental] = useState(() => {
    try {
      return localStorage.getItem('devMode.showExperimental') === 'true';
    } catch {
      return false;
    }
  });

  // Persist to localStorage and trigger storage event for other components
  useEffect(() => {
    try {
      localStorage.setItem('devMode.showExperimental', String(showExperimental));
      // Trigger storage event for cross-tab/cross-component sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'devMode.showExperimental',
        newValue: String(showExperimental),
        storageArea: localStorage,
      }));
    } catch (error) {
      console.error('Failed to persist showExperimental setting:', error);
    }
  }, [showExperimental]);

  const testUsers = [
    { id: 'test-admin', label: 'Admin', role: 'admin' },
    { id: 'test-inspector1', label: 'Inspector 1', role: 'inspector' },
    { id: 'test-inspector2', label: 'Inspector 2', role: 'inspector' },
  ];

  const env = getRuntimeEnv();

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-warning/90 backdrop-blur-sm border-b border-warning-border shadow-lg"
      data-testid="banner-dev-mode"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-warning-foreground" />
            <span className="font-semibold text-warning-foreground text-sm">
              Development Mode - Test Authentication Active
            </span>
            <Badge variant="outline" className="text-warning-foreground border-warning-foreground">
              {env}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Experimental Routes Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-md border border-border">
              <Beaker className="h-4 w-4 text-muted-foreground" />
              <Label 
                htmlFor="show-experimental" 
                className="text-sm font-medium cursor-pointer"
                data-testid="label-show-experimental"
              >
                Show Experimental Routes
              </Label>
              <Switch
                id="show-experimental"
                checked={showExperimental}
                onCheckedChange={setShowExperimental}
                data-testid="switch-show-experimental"
              />
            </div>

            {/* Quick Login Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-warning-foreground text-sm font-medium">Quick Login:</span>
              {testUsers.map((user) => (
                <a
                  key={user.id}
                  href={`/api/dev-login/${user.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-background text-foreground rounded-md hover-elevate active-elevate-2 text-sm font-medium border border-border"
                  data-testid={`link-dev-login-${user.id}`}
                >
                  <User className="h-3 w-3" />
                  {user.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to get show experimental setting
 * 
 * Listens to localStorage changes for cross-component sync.
 * 
 * @returns Current showExperimental state
 */
export function useShowExperimental(): boolean {
  const [showExperimental, setShowExperimental] = useState(() => {
    if (getRuntimeEnv() !== 'dev') return false;
    try {
      return localStorage.getItem('devMode.showExperimental') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'devMode.showExperimental') {
        setShowExperimental(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return showExperimental;
}
