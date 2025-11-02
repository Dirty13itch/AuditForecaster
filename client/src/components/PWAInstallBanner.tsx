import { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function PWAInstallBanner() {
  const pwaInstall = usePWAInstall();
  const haptic = useHapticFeedback();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  // Listen for iOS install instructions event
  useEffect(() => {
    const handleIOSInstructions = () => setShowIOSDialog(true);
    window.addEventListener('show-ios-install-instructions', handleIOSInstructions);
    return () => window.removeEventListener('show-ios-install-instructions', handleIOSInstructions);
  }, []);

  // Don't show if already installed or dismissed
  if (!pwaInstall.showInstallPrompt || pwaInstall.isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    haptic.vibrate('medium');
    if (pwaInstall.isIOS) {
      setShowIOSDialog(true);
    } else {
      await pwaInstall.installApp();
    }
  };

  const handleDismiss = () => {
    haptic.vibrate('light');
    pwaInstall.dismissPrompt();
  };

  return (
    <>
      <AnimatePresence>
        {pwaInstall.showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:max-w-sm"
          >
            <Card className="p-4 shadow-lg border-primary/20 bg-background/95 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-sm" data-testid="text-install-title">
                    Install Energy Audit Pro
                  </h3>
                  <p className="text-xs text-muted-foreground" data-testid="text-install-description">
                    Add to your home screen for quick access and offline functionality
                  </p>
                  
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="flex-1"
                      data-testid="button-install-app"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Install App
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      data-testid="button-dismiss-install"
                    >
                      Not Now
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDismiss}
                  data-testid="button-close-install"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Instructions Dialog */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <p className="text-sm">
                  To install Energy Audit Pro on your iPhone or iPad:
                </p>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                      1
                    </span>
                    <div className="space-y-1">
                      <p>Tap the Share button</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Share className="w-3 h-3" />
                        <span>(at the bottom of Safari)</span>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                      2
                    </span>
                    <div className="space-y-1">
                      <p>Scroll down and tap</p>
                      <p className="font-semibold">"Add to Home Screen"</p>
                    </div>
                  </li>
                  
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                      3
                    </span>
                    <div>
                      <p>Tap "Add" in the top-right corner</p>
                    </div>
                  </li>
                </ol>
                
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    The app will appear on your home screen and work like a native app with offline support.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}