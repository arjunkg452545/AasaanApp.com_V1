import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Download, X, Smartphone, Share } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Don't show if already installed
    if (standalone) {
      return;
    }

    // Check if user dismissed in last 24 hours
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return; // Don't show if dismissed within 24 hours
      }
    }

    // Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after small delay
      setTimeout(() => setShowInstall(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS - show custom instructions after 2 seconds
    if (iOS && !window.navigator.standalone) {
      setTimeout(() => setShowInstall(true), 2000);
    }

    // For browsers that don't support beforeinstallprompt (fallback)
    // Show generic install prompt after 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && !iOS) {
        // Check if it's a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          setShowInstall(true);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installed successfully');
      }
      
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
    // Store dismissal time (will show again after 24 hours)
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  // Don't show if already installed or banner hidden
  if (!showInstall || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/20 to-transparent">
      <Card className="max-w-md mx-auto p-4 shadow-2xl border-2 border-[#CF2030] bg-white">
        <div className="flex items-start gap-3">
          {/* App Icon - Using Aasaan App Logo */}
          <img 
            src="/icons/icon-72x72.png" 
            alt="Aasaan App" 
            className="h-14 w-14 rounded-xl flex-shrink-0 shadow-lg"
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg">📲 Aasaan App Install करें</h3>
            
            {isIOS ? (
              // iOS Instructions
              <div className="mt-2">
                <p className="text-sm text-slate-600 mb-2">
                  iPhone/iPad पर Install करने के लिए:
                </p>
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <span>नीचे <Share className="inline h-4 w-4" /> Share बटन दबाएं</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <span>"Add to Home Screen" चुनें</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <span>"Add" दबाएं ✓</span>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              // Android/Chrome with native prompt
              <div className="mt-2">
                <p className="text-sm text-slate-600 mb-3">
                  तेज़ access के लिए Home Screen पर Add करें
                </p>
                <Button
                  onClick={handleInstallClick}
                  className="bg-[#CF2030] hover:bg-[#A61926] w-full font-semibold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  अभी Install करें
                </Button>
              </div>
            ) : (
              // Generic fallback instructions
              <div className="mt-2">
                <p className="text-sm text-slate-600 mb-2">
                  App Install करने के लिए:
                </p>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                  Browser menu (⋮) में जाकर <strong>"Add to Home Screen"</strong> या <strong>"Install App"</strong> चुनें
                </div>
              </div>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            🔒 Safe & Secure • No storage needed • Works offline
          </p>
        </div>
      </Card>
    </div>
  );
}
