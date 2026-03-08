import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, XCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function QRAttendanceScanner() {
  const [status, setStatus] = useState('loading'); // loading | scanning | success | error | denied
  const [errorMsg, setErrorMsg] = useState('');
  const scannerInstanceRef = useRef(null);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  const safeStop = useCallback(async () => {
    const instance = scannerInstanceRef.current;
    if (!instance) return;
    try {
      const state = instance.getState();
      if (state === 2 || state === 3) await instance.stop();
    } catch { /* ignore */ }
    // Don't call clear() — it removes the DOM element and can cause camera to re-prompt
    scannerInstanceRef.current = null;
  }, []);

  const handleScanResult = useCallback((decodedText) => {
    safeStop();
    if (!mountedRef.current) return;

    // Extract token from QR URL — do NOT open the URL
    let token = null;
    try {
      const url = new URL(decodedText);
      token = url.searchParams.get('token');
      if (!token || !url.pathname.includes('/attendance')) token = null;
    } catch { /* not a URL */ }

    // Fallback: raw token string
    if (!token && decodedText && !decodedText.includes(' ') && decodedText.length > 10) {
      token = decodedText;
    }

    if (token) {
      setStatus('success');
      setTimeout(() => {
        if (mountedRef.current) navigate(`/attendance?token=${token}`);
      }, 800);
    } else {
      setStatus('error');
      setErrorMsg('Invalid QR code. Not a meeting attendance QR.');
    }
  }, [navigate, safeStop]);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('denied');
      setErrorMsg('Camera not supported on this device or browser.');
      return;
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mountedRef.current) return;

      const el = document.getElementById('qr-reader');
      if (!el) { setStatus('error'); setErrorMsg('Scanner element not found.'); return; }

      const html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
      scannerInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0,
          disableFlip: false, videoConstraints: { facingMode: 'environment' } },
        (decodedText) => handleScanResult(decodedText),
        () => {}
      );

      if (!mountedRef.current) { safeStop(); return; }

      // Make the video fill the entire screen
      const video = el.querySelector('video');
      if (video) {
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'cover';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
      }
      // Hide the default html5-qrcode UI elements
      const scanRegion = el.querySelector('#qr-shaded-region');
      if (scanRegion) scanRegion.style.display = 'none';

      setStatus('scanning');
    } catch (err) {
      if (!mountedRef.current) return;
      const errStr = err?.toString() || '';
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setStatus('denied');
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errStr.includes('NotFoundError') || errStr.includes('Requested device not found')) {
        setStatus('denied');
        setErrorMsg('No camera found on this device.');
      } else {
        setStatus('error');
        setErrorMsg('Could not start camera. Please try again.');
      }
    }
  }, [handleScanResult, safeStop]);

  // Auto-start camera on mount
  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => { mountedRef.current = false; safeStop(); };
  }, [startScanner, safeStop]);

  const retry = () => { setStatus('loading'); setErrorMsg(''); startScanner(); };
  const goBack = () => navigate('/app/home');

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Back button — top overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 pt-4 pb-8"
           style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={goBack} className="flex items-center gap-2 text-white/90 active:text-white">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Full-screen camera */}
      <div className="flex-1 relative overflow-hidden">
        <div id="qr-reader" style={{ width: '100%', height: '100%', position: 'relative' }} />

        {/* Paytm-style overlay: dark edges + clear center rectangle */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Semi-transparent dark overlay with transparent center cutout */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="scanMask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x="50%" y="50%" width="260" height="260" rx="16"
                        transform="translate(-130, -130)" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#scanMask)" />
            </svg>
            {/* Animated scan line inside the cutout */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px]">
              <div className="absolute left-3 right-3 h-[2px] rounded-full animate-scan-line"
                   style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }} />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Camera className="h-8 w-8 text-white animate-pulse" />
            </div>
            <p className="text-sm text-white/70">Starting camera...</p>
          </div>
        )}

        {/* Success overlay */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="h-14 w-14 text-green-400" />
            </div>
            <p className="text-lg font-bold text-white mb-1">QR Scanned!</p>
            <p className="text-sm text-white/60">Loading attendance form...</p>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <XCircle className="h-14 w-14 text-red-400" />
            </div>
            <p className="text-lg font-bold text-white mb-2">Scan Failed</p>
            <p className="text-sm text-white/60 text-center mb-6">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={retry} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
              <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white/80 border border-white/20">
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Camera denied / not found overlay */}
        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(245,158,11,0.2)' }}>
              <AlertTriangle className="h-14 w-14 text-amber-400" />
            </div>
            <p className="text-lg font-bold text-white mb-2">Camera Unavailable</p>
            <p className="text-sm text-white/60 text-center mb-6">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={retry} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
              <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white/80 border border-white/20">
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint bar */}
      {status === 'scanning' && (
        <div className="px-6 py-4 text-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <p className="text-sm text-white/70">Point camera at QR code</p>
        </div>
      )}

      {/* Scan line animation */}
      <style>{`
        @keyframes scanLine {
          0% { top: 8px; }
          50% { top: calc(100% - 10px); }
          100% { top: 8px; }
        }
        .animate-scan-line {
          animation: scanLine 2.5s ease-in-out infinite;
        }
        /* Hide html5-qrcode default UI */
        #qr-reader > div:not(:first-child) { display: none !important; }
        #qr-reader img { display: none !important; }
        #qr-reader__dashboard_section { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        #qr-reader__header_message { display: none !important; }
      `}</style>
    </div>
  );
}
