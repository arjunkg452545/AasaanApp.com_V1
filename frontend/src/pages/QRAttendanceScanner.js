import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, XCircle, CheckCircle2, AlertTriangle, RefreshCw, Clock, Home, Info } from 'lucide-react';
import jsQR from 'jsqr';
import api from '../utils/api';

export default function QRAttendanceScanner() {
  // loading | scanning | marking | success | error | denied | already | warning
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [scanHint, setScanHint] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const mountedRef = useRef(true);
  const autoNavRef = useRef(null);
  const hintTimerRef = useRef(null);
  const processingRef = useRef(false);

  const navigate = useNavigate();

  // ─── Stop camera stream and animation frame ───
  const stopCamera = useCallback(() => {
    // Cancel animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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
      }, 3000);
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

  // ─── jsQR scanning loop via requestAnimationFrame ───
  const scanLoop = useCallback(() => {
    if (!mountedRef.current || processingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleScanResult(code.data);
      return; // Stop loop — we got a result
    }

    // Continue scanning
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleScanResult]);

  // ─── Start camera and begin scanning ───
  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    setScanHint(false);
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
      // Request camera — NO width/height constraints for maximum compatibility
      // Let browser pick optimal resolution (especially important for iOS)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
          setStatus('scanning');

          // Start jsQR scanning loop
          animFrameRef.current = requestAnimationFrame(scanLoop);

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
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings, then tap Retry.');
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
  }, [scanLoop, stopCamera]);

  // ─── Mount / Unmount + iOS visibility handling ───
  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    // Handle iOS PWA returning from background — camera stream may be dead
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        // Check if stream is still active
        const stream = streamRef.current;
        if (stream) {
          const tracks = stream.getTracks();
          const allEnded = tracks.every(t => t.readyState === 'ended');
          if (allEnded) {
            // Stream died in background — restart
            startScanner();
          }
        } else if (!processingRef.current) {
          // No stream — restart if we were supposed to be scanning
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
        muted
        autoPlay
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', zIndex: 1 }}
      />

      {/* Hidden canvas for jsQR processing — never displayed */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning overlay — crosshair corners */}
      {status === 'scanning' && (
        <div className="fixed inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="relative" style={{ width: '260px', height: '260px' }}>
            {/* Top-left corner */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
            {/* Top-right corner */}
            <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
            {/* Bottom-left corner */}
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
            {/* Scanning line animation */}
            <div className="absolute left-2 right-2 h-[2px] bg-[#CF2030] animate-scan-line" style={{
              animation: 'scanLine 2s ease-in-out infinite',
            }} />
          </div>
        </div>
      )}

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
          <button onClick={goBack} className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
            <Home className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-xs text-white/30 mt-3">Auto-redirecting in 3 seconds...</p>
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
          <button onClick={goBack} className="flex items-center gap-2 px-8 min-h-[48px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
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
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20">
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
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20">
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
            <button onClick={retry} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white" style={{ background: '#CF2030' }}>
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-6 min-h-[44px] rounded-xl text-sm font-semibold text-white/80 border border-white/20">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Scanning line animation keyframes */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 8px; opacity: 0.4; }
          50% { top: calc(100% - 10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
