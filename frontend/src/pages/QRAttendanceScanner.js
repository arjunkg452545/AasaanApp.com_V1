import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function QRAttendanceScanner() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const navigate = useNavigate();

  const startScanner = async () => {
    setError(null);
    setCameraReady(false);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          // QR code detected
          handleScanResult(decodedText);
        },
        () => {
          // Scan error (no QR found in frame) — ignore
        }
      );
      setScanning(true);
      setCameraReady(true);
    } catch (err) {
      console.error('Camera error:', err);
      if (err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err?.toString().includes('NotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError('Could not start camera. Please try again.');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current && scanning) {
      try {
        await scannerInstanceRef.current.stop();
        scannerInstanceRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerInstanceRef.current = null;
      setScanning(false);
      setCameraReady(false);
    }
  };

  const handleScanResult = (decodedText) => {
    // Stop scanner immediately to prevent duplicate scans
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.stop().then(() => {
          try { scannerInstanceRef.current?.clear(); } catch {}
          scannerInstanceRef.current = null;
          setScanning(false);
        }).catch(() => {});
      } catch {
        scannerInstanceRef.current = null;
        setScanning(false);
      }
    }

    // Check if the decoded text is an attendance URL
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      if (token && url.pathname.includes('/attendance')) {
        toast.success('QR Code scanned!');
        // Navigate to the attendance form with the token
        navigate(`/attendance?token=${token}`);
        return;
      }
    } catch {
      // Not a URL — try to extract token directly
    }

    // If the QR contains just a token string
    if (decodedText && !decodedText.includes(' ') && decodedText.length > 10) {
      toast.success('QR Code scanned!');
      navigate(`/attendance?token=${decodedText}`);
      return;
    }

    toast.error('Invalid QR code. Please scan a meeting attendance QR.');
    // Restart scanner after invalid scan
    setTimeout(() => startScanner(), 1500);
  };

  useEffect(() => {
    startScanner();
    return () => {
      try {
        if (scannerInstanceRef.current) {
          const state = scannerInstanceRef.current.getState();
          // Only stop if scanner is actually scanning or paused (states 2 and 3)
          if (state === 2 || state === 3) {
            scannerInstanceRef.current.stop().catch(() => {});
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []); // eslint-disable-line

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="nm-raised rounded-xl p-2.5">
          <ScanLine className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Scan QR</h1>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Scan meeting QR code for attendance</p>
        </div>
      </div>

      {/* Scanner area */}
      <div className="nm-raised rounded-2xl overflow-hidden">
        <div className="relative">
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />

          {/* Scanning overlay */}
          {scanning && cameraReady && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[250px] h-[250px] relative">
                {/* Corner marks */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 rounded-tl-lg" style={{ borderColor: '#CF2030' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 rounded-tr-lg" style={{ borderColor: '#CF2030' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 rounded-bl-lg" style={{ borderColor: '#CF2030' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 rounded-br-lg" style={{ borderColor: '#CF2030' }} />
              </div>
            </div>
          )}

          {/* Loading state */}
          {!cameraReady && !error && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="nm-raised rounded-2xl p-6 mb-4">
                <Camera className="h-8 w-8 animate-pulse" style={{ color: 'var(--nm-text-muted)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Starting camera...</p>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="p-6 text-center">
            <div className="nm-pressed rounded-2xl p-6 mb-4 inline-flex">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--nm-text-secondary)' }}>{error}</p>
            <button
              onClick={() => { setError(null); startScanner(); }}
              className="nm-btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 nm-raised rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--nm-text-muted)' }}>How to use</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0">1&#65039;&#8419;</span>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Ask your chapter admin to display the meeting QR code</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0">2&#65039;&#8419;</span>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Point your camera at the QR code on the screen</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0">3&#65039;&#8419;</span>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Select your name and mark your attendance</p>
          </div>
        </div>
      </div>

      {/* Stop/Start button */}
      {scanning && (
        <div className="mt-4 text-center">
          <button
            onClick={stopScanner}
            className="nm-raised rounded-xl px-6 py-2.5 text-sm font-medium"
            style={{ color: 'var(--nm-text-secondary)' }}
          >
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
}
