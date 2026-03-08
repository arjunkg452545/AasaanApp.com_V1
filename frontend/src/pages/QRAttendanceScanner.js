import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, XCircle, CheckCircle2, AlertTriangle, RefreshCw, Clock, Home, Info } from 'lucide-react';
import jsQR from 'jsqr';
import api from '../utils/api';

// ─── Platform detection (outside component — evaluated once) ───
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_PWA = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
const SCAN_INTERVAL_MS = 80;
const SCAN_CANVAS_WIDTH = 480;

export default function QRAttendanceScanner() {
  // loading | scanning | marking | success | error | denied | already | warning
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [scanHint, setScanHint] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const autoNavRef = useRef(null);
  const hintTimerRef = useRef(null);
  const processingRef = useRef(false);

  const navigate = useNavigate();

  // ─── Stop camera stream and scan interval ───
  const stopCamera = useCallback(() => {
    // Clear scan interval
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Clear video srcObject
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // ─── Handle decoded QR result ───
  const handleScanResult = useCallback(async (decodedText) => {
    if (processingRef.current) return;
    processingRef.current = true;

    // Clear hint timer
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    setScanHint(false);

    // Vibration feedback
    if (navigator.vibrate) navigator.vibrate(200);

    // Stop camera immediately
    stopCamera();
    if (!mountedRef.current) return;

    // Extract token from URL
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

    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid QR code. This is not a meeting attendance QR.');
      processingRef.current = false;
      return;
    }

    // Call backend API directly
    setStatus('marking');
    try {
      const response = await api.post('/member/mark-attendance', { token });
      if (!mountedRef.current) return;

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setResult(response.data);
      setStatus('success');

      autoNavRef.current = setTimeout(() => {
        if (mountedRef.current) navigate('/app/home', { replace: true });
      }, 2500);
    } catch (err) {
      if (!mountedRef.current) return;

      const detail = err.response?.data?.detail || '';
      const detailLower = typeof detail === 'string' ? detail.toLowerCase() : '';

      if (detailLower.includes('already') || detailLower.includes('duplicate')) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setStatus('already');
        setErrorMsg(detail);
      } else if (detailLower.includes('hasn\'t started') || detailLower.includes('not yet open') || detailLower.includes('not started')) {
        setStatus('warning');
        setErrorMsg(detail);
      } else if (detailLower.includes('ended') || detailLower.includes('closed') || detailLower.includes('expired')) {
        setStatus('error');
        setErrorMsg(detail || 'Meeting has ended. Attendance window is closed.');
      } else if (detailLower.includes('different chapter') || detailLower.includes('not your chapter')) {
        setStatus('error');
        setErrorMsg('This QR code is for a different chapter. Please scan your chapter\'s QR code.');
      } else if (!err.response) {
        setStatus('error');
        setErrorMsg('Network error. Check your internet connection and try again.');
      } else {
        setStatus('error');
        setErrorMsg(detail || 'Failed to mark attendance. Please try again.');
      }

      processingRef.current = false;
    }
  }, [navigate, stopCamera]);

  // ─── Start camera and begin scanning ───
  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    setScanHint(false);
    setCameraReady(false);
    processingRef.current = false;

    if (autoNavRef.current) { clearTimeout(autoNavRef.current); autoNavRef.current = null; }
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }

    // Stop any existing camera first
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('denied');
      setErrorMsg('Camera not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach(t => t.stop());
        setStatus('error');
        setErrorMsg('Scanner element not found.');
        return;
      }

      // Critical iOS attributes — MUST be set BEFORE srcObject
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;

      video.srcObject = stream;

      // Wait for video to be ready, then start scanning
      video.onloadedmetadata = () => {
        if (!mountedRef.current) return;
        video.play().then(() => {
          if (!mountedRef.current) return;
          setCameraReady(true);
          setStatus('scanning');

          // Start jsQR scanning loop via setInterval (not rAF — consistent ~12fps)
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          scanTimerRef.current = setInterval(() => {
            if (!mountedRef.current || processingRef.current) return;
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

            // Downscale for performance
            const scale = Math.min(SCAN_CANVAS_WIDTH / video.videoWidth, 1);
            const w = Math.floor(video.videoWidth * scale);
            const h = Math.floor(video.videoHeight * scale);
            canvas.width = w;
            canvas.height = h;

            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              handleScanResult(code.data);
            }
          }, SCAN_INTERVAL_MS);

          // Start 10-second hint timer
          hintTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setScanHint(true);
          }, 10000);
        }).catch(() => {
          if (!mountedRef.current) return;
          setStatus('error');
          setErrorMsg('Could not start video playback. Please try again.');
        });
      };

    } catch (err) {
      if (!mountedRef.current) return;
      const errStr = err?.name || err?.message || err?.toString() || '';

      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setStatus('denied');
        if (IS_IOS && IS_PWA) {
          setErrorMsg('Camera denied. Go to iPhone Settings \u2192 Safari \u2192 Camera \u2192 Allow, then reopen app.');
        } else if (IS_IOS) {
          setErrorMsg('Camera denied. Tap \u201CAa\u201D in Safari address bar \u2192 Website Settings \u2192 Camera \u2192 Allow.');
        } else {
          setErrorMsg('Camera permission denied. Allow camera in browser settings and retry.');
        }
      } else if (errStr.includes('NotFoundError') || errStr.includes('no camera')) {
        setStatus('denied');
        setErrorMsg('No camera found on this device.');
      } else if (errStr.includes('NotReadableError') || errStr.includes('in use')) {
        setStatus('error');
        setErrorMsg('Camera is in use by another app. Close other camera apps and try again.');
      } else {
        setStatus('error');
        setErrorMsg('Could not start camera. Please close other apps using the camera and try again.');
      }
    }
  }, [handleScanResult, stopCamera]);

  // ─── Mount / Unmount + visibility handling ───
  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    // Handle app returning from background — camera stream may be dead
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save battery when backgrounded
        stopCamera();
      } else if (document.visibilityState === 'visible' && mountedRef.current) {
        const stream = streamRef.current;
        const streamDead = !stream || stream.getTracks().every(t => t.readyState === 'ended');
        if (streamDead && !processingRef.current) {
          startScanner();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopCamera();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (autoNavRef.current) { clearTimeout(autoNavRef.current); autoNavRef.current = null; }
      if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    };
  }, [startScanner, stopCamera]);

  const retry = () => startScanner();
  const goBack = () => navigate('/app/home');

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
      {/* Camera video — full screen, covers entire viewport */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        muted
        autoPlay
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', zIndex: 1, opacity: cameraReady ? 1 : 0, transition: 'opacity 0.15s ease' }}
      />

      {/* Hidden canvas for jsQR processing — never displayed */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning overlay — Paytm-style full-screen scan effect */}
      {status === 'scanning' && (
        <>
          {/* Subtle edge vignette — makes corner lights pop */}
          <div className="fixed inset-0 z-[5] pointer-events-none" style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.25) 100%), linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.2) 100%)',
          }} />

          {/* Full-screen scan line */}
          <div className="fixed left-4 right-4 h-[2px] z-[6] pointer-events-none" style={{
            background: 'linear-gradient(90deg, transparent, #CF2030 30%, #CF2030 70%, transparent)',
            animation: 'scanLine 2.5s ease-in-out infinite',
          }} />

          {/* Corner light pulses — top-left */}
          <div className="fixed top-4 left-4 z-[6] pointer-events-none" style={{ animation: 'cornerPulse 2s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '80px', height: '3px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '80px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
          </div>

          {/* Corner light pulses — top-right */}
          <div className="fixed top-4 right-4 z-[6] pointer-events-none" style={{ animation: 'cornerPulse 2s ease-in-out infinite 0.5s' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '3px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '80px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
          </div>

          {/* Corner light pulses — bottom-right */}
          <div className="fixed bottom-4 right-4 z-[6] pointer-events-none" style={{ animation: 'cornerPulse 2s ease-in-out infinite 1s' }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '80px', height: '3px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '3px', height: '80px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
          </div>

          {/* Corner light pulses — bottom-left */}
          <div className="fixed bottom-4 left-4 z-[6] pointer-events-none" style={{ animation: 'cornerPulse 2s ease-in-out infinite 1.5s' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '80px', height: '3px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '3px', height: '80px', background: '#CF2030', borderRadius: '2px', boxShadow: '0 0 15px #CF2030, 0 0 30px rgba(207,32,48,0.5)' }} />
          </div>
        </>
      )}

      {/* Top gradient overlay */}
      <div className="fixed top-0 left-0 right-0 z-10 px-4 pt-4 pb-10 flex items-center justify-between"
           style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
        <button onClick={goBack} className="flex items-center gap-2 text-white/90 active:text-white active:scale-95 transition-transform min-h-[44px]">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        {status === 'scanning' && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-sm font-medium text-white/80">Scanning</span>
          </div>
        )}
      </div>

      {/* Bottom gradient hint */}
      {status === 'scanning' && (
        <div className="fixed bottom-0 left-0 right-0 z-10 px-6 pt-10 pb-8 text-center"
             style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
          <p className="text-sm text-white/70">Point camera at QR code</p>
          {scanHint && (
            <p className="text-xs text-amber-300/80 mt-2 animate-pulse">
              Having trouble? Hold phone steady and ensure good lighting
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center" style={{ background: '#000' }}>
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Camera className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-sm text-white/60">Starting camera...</p>
          {IS_IOS && (
            <p className="text-xs text-amber-300/70 mt-3 px-8 text-center">
              On iPhone: Tap "Allow" when prompted for camera access
            </p>
          )}
        </div>
      )}

      {/* Marking attendance */}
      {status === 'marking' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <div className="h-12 w-12 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#60A5FA', borderTopColor: 'transparent' }} />
          </div>
          <p className="text-lg font-bold text-white mb-1">Marking Attendance...</p>
          <p className="text-sm text-white/50">Please wait</p>
        </div>
      )}

      {/* SUCCESS */}
      {status === 'success' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="rounded-full p-6 mb-5 animate-bounce-once" style={{ background: 'rgba(34,197,94,0.15)' }}>
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
          <button onClick={goBack} className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ background: '#CF2030' }}>
            <Home className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-xs text-white/30 mt-3">Auto-redirecting...</p>
        </div>
      )}

      {/* ALREADY MARKED — blue info */}
      {status === 'already' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Info className="h-14 w-14 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white mb-2">Already Marked!</p>
          <p className="text-sm text-white/60 text-center mb-6 max-w-xs">
            Your attendance for this meeting is already recorded.
          </p>
          <button onClick={goBack} className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ background: '#CF2030' }}>
            <Home className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      )}

      {/* WARNING — meeting not started (yellow) */}
      {status === 'warning' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Clock className="h-14 w-14 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white mb-2">Too Early!</p>
          <p className="text-sm text-white/60 text-center mb-6 max-w-xs">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20 active:scale-95 transition-transform">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* ERROR — generic (red) */}
      {status === 'error' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <XCircle className="h-14 w-14 text-red-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Failed</p>
          <p className="text-sm text-white/50 text-center mb-6 max-w-xs">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20 active:scale-95 transition-transform">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* DENIED — camera unavailable */}
      {status === 'denied' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-full p-5 mb-4" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle className="h-14 w-14 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Camera Unavailable</p>
          <p className="text-sm text-white/50 text-center mb-6 max-w-xs">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20 active:scale-95 transition-transform">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.4; }
          50% { top: 80%; opacity: 1; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.3; filter: blur(0px); }
          50% { opacity: 1; filter: blur(1px); }
        }
        @keyframes bounceOnce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-once {
          animation: bounceOnce 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
