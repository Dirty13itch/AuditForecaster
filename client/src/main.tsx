import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clientLogger, swLogger } from "./lib/logger";
import { initSessionReplay } from "./lib/sessionReplay";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        clientLogger.info('[SW] Service Worker registered successfully:', registration.scope);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                clientLogger.info('[SW] New version available. Reload to update.');
                
                if (confirm('A new version is available. Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        clientLogger.error('[SW] Service Worker registration failed:', error);
      });
  });
  
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_LOG') {
      const { level, message, args } = event.data;
      // Properly bind the logger method to preserve 'this' context
      switch (level) {
        case 'debug':
          swLogger.debug(message, ...args);
          break;
        case 'info':
          swLogger.info(message, ...args);
          break;
        case 'warn':
          swLogger.warn(message, ...args);
          break;
        case 'error':
          swLogger.error(message, ...args);
          break;
        default:
          swLogger.info(message, ...args);
      }
    }
    
    if (event.data && event.data.type === 'BACKGROUND_SYNC') {
      clientLogger.info('[SW] Background sync message received');
      window.dispatchEvent(new CustomEvent('background-sync'));
    }
  });
}

// Initialize session replay only in production when enabled
// This prevents unnecessary bundle size and costs during development
if (import.meta.env.VITE_SESSION_REPLAY_ENABLED === 'true' && import.meta.env.PROD) {
  initSessionReplay();
}

createRoot(document.getElementById("root")!).render(<App />);
