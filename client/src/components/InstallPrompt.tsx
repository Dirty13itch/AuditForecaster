import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { clientLogger } from '@/lib/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      clientLogger.info('[InstallPrompt] App is running in standalone mode');
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceDismissed < 7) {
        clientLogger.info('[InstallPrompt] Install prompt was dismissed recently, not showing');
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      clientLogger.info('[InstallPrompt] beforeinstallprompt event fired');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isIOSDevice && !isInStandaloneMode) {
      clientLogger.info('[InstallPrompt] iOS device detected, showing iOS install instructions');
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      clientLogger.warn('[InstallPrompt] No deferred prompt available');
      return;
    }

    setShowPrompt(false);
    
    try {
      await deferredPrompt.prompt();
      
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        clientLogger.info('[InstallPrompt] User accepted the install prompt');
      } else {
        clientLogger.info('[InstallPrompt] User dismissed the install prompt');
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      clientLogger.error('[InstallPrompt] Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    clientLogger.info('[InstallPrompt] User dismissed the install prompt banner');
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  if (isIOS) {
    return (
      <Card 
        className="fixed bottom-20 left-4 right-4 z-50 shadow-lg border-primary"
        data-testid="card-install-prompt-ios"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install Energy Audit Pro</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Install this app on your iPhone: tap <Share className="inline h-4 w-4 mx-1" /> and then "Add to Home Screen"
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0"
              data-testid="button-dismiss-install-ios"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="fixed bottom-20 left-4 right-4 z-50 shadow-lg border-primary"
      data-testid="card-install-prompt-android"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install Energy Audit Pro</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install this app for offline access and a better experience
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="flex-1"
                data-testid="button-install-app"
              >
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                data-testid="button-dismiss-install"
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
