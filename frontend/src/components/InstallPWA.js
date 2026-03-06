import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if user dismissed in last 7 days
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstall(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS — show after delay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !window.navigator.standalone) {
      setTimeout(() => setShowInstall(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  if (!showInstall || isStandalone) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-md mx-auto"
      style={{
        background: 'var(--nm-surface)',
        border: '1px solid var(--nm-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
    >
      <img
        src="/icons/icon-72x72.png"
        alt="Aasaan App"
        className="h-9 w-9 rounded-lg flex-shrink-0"
      />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
        Install Aasaan App for quick access
      </p>
      {deferredPrompt ? (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white flex-shrink-0"
          style={{ background: '#CF2030' }}
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
      ) : (
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--nm-text-secondary)' }}>
          Use browser menu
        </span>
      )}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-full"
        style={{ color: 'var(--nm-text-muted)' }}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
