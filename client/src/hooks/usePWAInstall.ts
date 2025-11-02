import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  showInstallPrompt: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  installApp: () => Promise<void>;
  dismissPrompt: () => void;
  showIOSInstructions: () => void;
}

const LOCAL_STORAGE_KEY = 'pwa-install-state';

export function usePWAInstall(): PWAInstallState {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  
  // Check if app is in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://');

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.dismissed) {
        setShowInstallPrompt(false);
      } else if (state.installed) {
        setIsInstalled(true);
        setShowInstallPrompt(false);
      }
    } else if (!isStandalone) {
      // Show prompt on first visit if not in standalone mode
      setShowInstallPrompt(true);
    }
  }, [isStandalone]);

  // Listen for beforeinstallprompt event (Chrome/Edge/Samsung Internet)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default prompt
      e.preventDefault();
      
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Show our custom prompt if not dismissed before
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!savedState || !JSON.parse(savedState).dismissed) {
        setShowInstallPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ installed: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install the app
  const installApp = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        showIOSInstructions();
      }
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ installed: true }));
      } else {
        // User dismissed, don't show again this session
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ dismissed: true, timestamp: Date.now() }));
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  // Dismiss the prompt
  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
      dismissed: true, 
      timestamp: Date.now() 
    }));
  };

  // Show iOS-specific instructions
  const showIOSInstructions = () => {
    // This will trigger a modal or toast with iOS install instructions
    const event = new CustomEvent('show-ios-install-instructions');
    window.dispatchEvent(event);
  };

  return {
    isInstallable: isInstallable || isIOS,
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone,
    showInstallPrompt,
    deferredPrompt,
    installApp,
    dismissPrompt,
    showIOSInstructions,
  };
}