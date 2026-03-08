import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, XCircle, CheckCircle2, AlertTriangle, RefreshCw, Clock, Home } from 'lucide-react';
import api from '../utils/api';

export default function QRAttendanceScanner() {
  const [status, setStatus] = useState('loading'); // loading | scanning | marking | success | error | denied | already
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null); // { late_type, member_name, ... }
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const autoNavRef = useRef(null);
  const navigate = useNavigate();

  const safeStop = useCallback(async () => {
    const inst = scannerRef.current;
    if (!inst) return;
    try {
      const s = inst.getState();
      if (s === 2 || s === 3) await inst.stop();
    } catch { /* already stopped */ }
    // NEVER call inst.clear() — it revokes camera permission
    scannerRef.current = null;
  }, []);

  const handleScanResult = useCallback(async (decodedText) => {
    // Stop scanner immediately
    safeStop();
    if (!mountedRef.current) return;

    // Extract token from URL
    let token = null;
    try {
      const url = new URL(decodedText);
      token = url.searchParams.get('token');
      if (!token || !url.pathname.includes('/attendance')) token = null;
    } catch { /* not a URL */ }

    // Fallback: if not a URL, try using as raw token
    if (!token && decodedText && !decodedText.includes(' ') && decodedText.length > 10) {
      token = decodedText;
    }

    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid QR code. Not a meeting attendance QR.');
      return;
    }

    // Call backend API directly — DO NOT navigate anywhere
    setStatus('marking');
    try {
      const response = await api.post('/member/mark-attendance', { token });
      if (!mountedRef.current) return;

      setResult(response.data);
      setStatus('success');

      // Auto-navigate to dashboard after 3 seconds
      autoNavRef.current = setTimeout(() => {
        if (mountedRef.current) navigate('/app/home', { replace: true });
      }, 3000);
    } catch (err) {
      if (!mountedRef.current) return;

      const detail = err.response?.data?.detail || 'Failed to mark attendance';

      // Check if it's "already marked" type error
      if (typeof detail === 'string' && (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('duplicate'))) {
        setStatus('already');
        setErrorMsg(detail);
      } else {
        setStatus('error');
        setErrorMsg(detail);
      }
    }
  }, [navigate, safeStop]);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);

    // Clear any pending auto-nav
    if (autoNavRef.current) { clearTimeout(autoNavRef.current); autoNavRef.current = null; }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('denied');
      setErrorMsg('Camera not supported on this browser.');
      return;
    }

    // Step 1: Warm up camera permission
    let permissionOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      stream.getTracks().forEach(track => track.stop());
      permissionOk = true;
    } catch (err) {
      const s = err?.name || err?.toString() || '';
      if (s.includes('NotAllowedError') || s.includes('Permission')) {
        setStatus('denied');
        setErrorMsg('Camera permission denied. Allow camera in browser settings, then retry.');
        return;
      } else if (s.includes('NotFoundError')) {
        setStatus('denied');
        setErrorMsg('No camera found on this device.');
        return;
      }
    }

    if (!mountedRef.current) return;

    // Step 2: Start html5-qrcode scanner
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

      // Force the video to fill entire viewport
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
      if (permissionOk) {
        setStatus('error');
        setErrorMsg('Could not start scanner. Please try again.');
      } else {
        setStatus('denied');
        setErrorMsg('Camera permission denied. Allow camera in browser settings.');
      }
    }
  }, [handleScanResult, safeStop]);

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      safeStop();
      if (autoNavRef.current) { clearTimeout(autoNavRef.current); autoNavRef.current = null; }
    };
  }, [startScanner, safeStop]);

  const retry = () => startScanner();
  const goBack = () => navigate('/app/home');

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
      {/* Camera container */}
      <div id="qr-reader" className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* Top gradient overlay */}
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

      {/* Bottom gradient hint */}
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

      {/* Marking attendance (API call in progress) */}
      {status === 'marking' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <div className="h-12 w-12 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#60A5FA', borderTopColor: 'transparent' }} />
          </div>
          <p className="text-lg font-bold text-white mb-1">Marking Attendance...</p>
          <p className="text-sm text-white/50">Please wait</p>
        </div>
      )}

      {/* Success — attendance marked */}
      {status === 'success' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="rounded-full p-6 mb-5" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <CheckCircle2 className="h-16 w-16 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">Attendance Marked!</p>

          {result && (
            <div className="w-full max-w-xs space-y-3 mb-6">
              {result.member_name && (
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-xs text-white/50 mb-1">Member</p>
                  <p className="text-base font-semibold text-white">{result.member_name}</p>
                </div>
              )}
              <div className="rounded-xl px-4 py-3 text-center" style={{
                background: result.late_type === 'On time' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'
              }}>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: result.late_type === 'On time' ? '#4ADE80' : '#FBBF24' }} />
                  <p className="text-base font-bold" style={{ color: result.late_type === 'On time' ? '#4ADE80' : '#FBBF24' }}>
                    {result.late_type || 'Recorded'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={goBack}
            className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white"
            style={{ background: '#CF2030' }}
          >
            <Home className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-xs text-white/30 mt-3">Auto-redirecting in 3 seconds...</p>
        </div>
      )}

      {/* Already marked */}
      {status === 'already' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <CheckCircle2 className="h-14 w-14 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Already Marked</p>
          <p className="text-sm text-white/50 text-center mb-6">{errorMsg}</p>
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white"
            style={{ background: '#CF2030' }}
          >
            <Home className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <XCircle className="h-14 w-14 text-red-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Failed</p>
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
