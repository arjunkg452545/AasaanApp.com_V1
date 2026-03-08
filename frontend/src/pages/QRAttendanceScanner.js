import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, XCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function QRAttendanceScanner() {
  const [status, setStatus] = useState('loading'); // loading | scanning | success | error | denied
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  const safeStop = useCallback(async () => {
    const inst = scannerRef.current;
    if (!inst) return;
    try {
      const s = inst.getState();
      // 2 = SCANNING, 3 = PAUSED
      if (s === 2 || s === 3) await inst.stop();
    } catch { /* already stopped */ }
    scannerRef.current = null;
  }, []);

  const handleScanResult = useCallback((decodedText) => {
    safeStop();
    if (!mountedRef.current) return;

    // Extract token — NEVER open the QR URL in browser
    let token = null;
    try {
      const url = new URL(decodedText);
      token = url.searchParams.get('token');
      if (!token || !url.pathname.includes('/attendance')) token = null;
    } catch { /* not a URL — try raw token */ }

    if (!token && decodedText && !decodedText.includes(' ') && decodedText.length > 10) {
      token = decodedText;
    }

    if (token) {
      setStatus('success');
      setTimeout(() => { if (mountedRef.current) navigate(`/attendance?token=${token}`); }, 800);
    } else {
      setStatus('error');
      setErrorMsg('Invalid QR code. Not a meeting attendance QR.');
    }
  }, [navigate, safeStop]);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');

    // Camera API check
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('denied');
      setErrorMsg('Camera not supported on this browser.');
      return;
    }

    // Check permission state first (avoids re-prompting)
    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (perm.state === 'denied') {
          setStatus('denied');
          setErrorMsg('Camera permission blocked. Allow camera in your browser settings, then retry.');
          return;
        }
      }
    } catch { /* permissions API not available — continue */ }

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mountedRef.current) return;

      const el = document.getElementById('qr-reader');
      if (!el) { setStatus('error'); setErrorMsg('Scanner element not found.'); return; }

      const qr = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
        (text) => handleScanResult(text),
        () => {}
      );
      if (!mountedRef.current) { safeStop(); return; }

      // Force video to fill entire screen
      const video = el.querySelector('video');
      if (video) {
        Object.assign(video.style, {
          width: '100vw', height: '100vh', objectFit: 'cover',
          position: 'fixed', top: '0', left: '0', zIndex: '1',
        });
      }

      setStatus('scanning');
    } catch (err) {
      if (!mountedRef.current) return;
      const s = err?.toString() || '';
      if (s.includes('NotAllowedError') || s.includes('Permission')) {
        setStatus('denied');
        setErrorMsg('Camera permission denied. Allow camera in browser settings.');
      } else if (s.includes('NotFoundError') || s.includes('not found')) {
        setStatus('denied');
        setErrorMsg('No camera found on this device.');
      } else {
        setStatus('error');
        setErrorMsg('Could not start camera. Please try again.');
      }
    }
  }, [handleScanResult, safeStop]);

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => { mountedRef.current = false; safeStop(); };
  }, [startScanner, safeStop]);

  const retry = () => startScanner();
  const goBack = () => navigate('/app/home');

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
      {/* Camera container — sits behind overlays */}
      <div id="qr-reader" className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* Top gradient overlay — always on top of camera */}
      <div className="fixed top-0 left-0 right-0 z-10 px-4 pt-4 pb-10 flex items-center justify-between"
           style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
        <button onClick={goBack} className="flex items-center gap-2 text-white/90 active:text-white min-h-[44px]">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        {status === 'scanning' && (
          <span className="text-sm font-medium text-white/80">Scan QR for Attendance</span>
        )}
      </div>

      {/* Bottom gradient hint — only when scanning */}
      {status === 'scanning' && (
        <div className="fixed bottom-0 left-0 right-0 z-10 px-6 pt-10 pb-8 text-center"
             style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
          <p className="text-sm text-white/70">Point camera at QR code</p>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center" style={{ background: '#000' }}>
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Camera className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-sm text-white/60">Starting camera...</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <CheckCircle2 className="h-14 w-14 text-green-400" />
          </div>
          <p className="text-lg font-bold text-white mb-1">QR Scanned!</p>
          <p className="text-sm text-white/50">Loading attendance form...</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <XCircle className="h-14 w-14 text-red-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Scan Failed</p>
          <p className="text-sm text-white/50 text-center mb-6">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Denied */}
      {status === 'denied' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle className="h-14 w-14 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Camera Unavailable</p>
          <p className="text-sm text-white/50 text-center mb-6">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Hide all html5-qrcode default chrome */}
      <style>{`
        #qr-shaded-region { display: none !important; }
        #qr-reader > div:not(:first-child) { display: none !important; }
        #qr-reader img { display: none !important; }
        #qr-reader__dashboard_section { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        #qr-reader__header_message { display: none !important; }
        #qr-reader { overflow: hidden !important; }
      `}</style>
    </div>
  );
}
