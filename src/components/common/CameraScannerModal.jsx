import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, Keyboard, AlertCircle, Scan } from 'lucide-react';
import { SCAN_COOLDOWN_MS } from '../../utils/constants';
import { isValidStaffCode } from '../../utils/staffCodeGenerator';

// All 1D barcode formats we want to support for maximum compatibility
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export default function CameraScannerModal({ isOpen, onClose, onScanSuccess, title = "Scan Staff Barcode" }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [justScanned, setJustScanned] = useState(false);

  const html5QrcodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const keyboardBufferRef = useRef('');
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  // Track component mount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // USB/Bluetooth hardware barcode scanner keyboard listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') {
        const code = keyboardBufferRef.current.trim().toUpperCase();
        keyboardBufferRef.current = '';
        if (code && (isValidStaffCode(code) || code.startsWith('KSP-'))) {
          handleDetectedCode(code);
        }
      } else if (e.key.length === 1) {
        keyboardBufferRef.current += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setErrorMessage('');
      setManualMode(false);
    }
  }, [isOpen]);

  // Automatically start the best available camera immediately when modal opens
  useEffect(() => {
    if (!isOpen || manualMode) return;

    const autoStartBestCamera = async () => {
      await new Promise(r => setTimeout(r, 150));
      if (!mountedRef.current) return;

      await startResilientScanner();
    };

    autoStartBestCamera();
    return () => { stopScanner(); };
  }, [isOpen, manualMode]);

  const stopScanner = useCallback(async () => {
    startingRef.current = false;
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
      try {
        html5QrcodeRef.current.clear();
      } catch (e) {
        // ignore
      }
      html5QrcodeRef.current = null;
    }
    if (mountedRef.current) {
      setIsScanning(false);
      setTorchOn(false);
      setTorchSupported(false);
    }
  }, []);

  const buildConfig = () => ({
    fps: 25, // High-speed 25 FPS frame extraction for instant decoding without CPU overload
    qrbox: function(viewfinderWidth, viewfinderHeight) {
      const w = Math.min(Math.floor(viewfinderWidth * 0.92), 520);
      const h = Math.min(Math.floor(viewfinderHeight * 0.72), 320);
      return { width: Math.max(w, 240), height: Math.max(h, 130) };
    },
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true // GPU hardware-accelerated barcode decoding
    },
    rememberLastUsedCamera: true,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
  });

  const handleDetectedCode = (code) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 500) return;
    lastScanTimeRef.current = now;
    if (onScanSuccess) onScanSuccess(code);
  };

  const onDecodeSuccess = useCallback((decodedText) => {
    if (mountedRef.current) {
      setJustScanned(true);
      setTimeout(() => {
        if (mountedRef.current) setJustScanned(false);
      }, 400);
    }
    handleDetectedCode(decodedText);
  }, []);

  const onDecodeError = useCallback(() => {
    // Silent per-frame failure — expected behavior
  }, []);

  const applyOptimalCameraConstraints = async () => {
    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities();
          const advanced = {};
          if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
            advanced.focusMode = 'continuous';
          }
          if (caps.torch) {
            setTorchSupported(true);
          }
          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] });
          }
        }
      }
    } catch (e) {
      // ignore track constraint error
    }
  };

  // Resilient Multi-Tier Camera Startup Sequence (Prevents OverconstrainedError on Mobile)
  const startResilientScanner = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    await stopScanner();

    const readerEl = document.getElementById('reader');
    if (!readerEl) {
      startingRef.current = false;
      return;
    }

    const html5Qrcode = new Html5Qrcode("reader", {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false
    });
    html5QrcodeRef.current = html5Qrcode;

    const config = buildConfig();

    // List of camera start options to try sequentially without strict min constraints
    const cameraOptionsToTry = [
      // 1. Rear camera with ideal resolution (Soft constraints)
      { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      // 2. Generic rear facingMode
      { facingMode: "environment" },
      // 3. User / selfie facingMode
      { facingMode: "user" },
    ];

    // Try enumerating camera device IDs as additional options if available
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCam = devices.find(d => /back|rear|environment/i.test(d.label));
        if (backCam) {
          cameraOptionsToTry.unshift(backCam.id);
        } else {
          cameraOptionsToTry.push(devices[0].id);
        }
      }
    } catch (e) {
      // ignore camera enumeration failure
    }

    let startedSuccess = false;
    let lastError = null;

    for (const cameraOption of cameraOptionsToTry) {
      if (!mountedRef.current) break;
      try {
        await html5Qrcode.start(
          cameraOption,
          config,
          onDecodeSuccess,
          onDecodeError
        );
        startedSuccess = true;
        break;
      } catch (err) {
        lastError = err;
        console.warn("Camera option failed, trying next option:", cameraOption, err);
      }
    }

    if (startedSuccess && mountedRef.current) {
      setIsScanning(true);
      setErrorMessage('');
      startingRef.current = false;
      await applyOptimalCameraConstraints();
    } else if (mountedRef.current) {
      startingRef.current = false;
      setIsScanning(false);
      const isPermissionErr = lastError && /notallowed|permission/i.test(lastError.toString());
      if (isPermissionErr) {
        setErrorMessage('Camera access denied. Please tap the lock icon in your browser address bar to allow camera access.');
      } else {
        setErrorMessage('Unable to access camera device. Please grant permissions or use manual entry below.');
      }
    }
  };

  const toggleTorch = async () => {
    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      }
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim().toUpperCase());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="glass-panel rounded-[24px] max-w-lg w-full overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center">
              <Scan className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h3 className="font-bold text-white text-[15px] leading-tight">{title}</h3>
              <p className="text-[11px] text-white/40">Point camera at barcode for instant scan</p>
            </div>
          </div>
          <button onClick={onClose} className="glass-button p-2.5 rounded-2xl">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[340px]">
          {!manualMode ? (
            <div className="w-full flex flex-col items-center gap-3">
              {/* Camera Viewfinder */}
              <div className={`w-full rounded-2xl overflow-hidden border transition-all duration-200 bg-black/60 relative ${
                justScanned ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)]' : 'border-white/[0.08]'
              }`} style={{ minHeight: '280px' }}>
                <div id="reader" className="w-full"></div>

                {/* Flash/Torch button overlay if supported */}
                {torchSupported && (
                  <button type="button" onClick={toggleTorch}
                    className={`absolute top-3 right-3 z-30 glass-button p-2.5 rounded-2xl ${torchOn ? 'bg-white/20 border-white/30 text-amber-300' : 'text-white/70'}`}>
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                {/* Animated 1.5s Laser Scanner Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
                    {/* Corner Bracket Reticles */}
                    <div className="scanner-corner scanner-corner-tl" />
                    <div className="scanner-corner scanner-corner-tr" />
                    <div className="scanner-corner scanner-corner-bl" />
                    <div className="scanner-corner scanner-corner-br" />

                    {/* Animated Laser Scanline (1.5s Loop) */}
                    <div className="scanner-laser-line">
                      <div className="scanner-laser-beam" />
                    </div>

                    {/* Live Scanner Radar Status Badge */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 flex items-center gap-2 shadow-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[11px] font-mono text-emerald-300 font-semibold tracking-wide uppercase">
                        High-Speed Scanner Active • 1.5s
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl glass-button flex items-center justify-center mb-4">
                <Keyboard className="w-8 h-8 text-white/60" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Manual & Hardware Scanner Input</h4>
              <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                Type a staff code or scan with a USB/Bluetooth barcode scanner device.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-3.5 glass-card rounded-2xl text-white/80 text-xs flex items-center gap-2.5 w-full border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Manual Input Footer */}
        <div className="p-4 border-t border-white/[0.06] flex flex-col gap-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. KSP-137-052-1025"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="glass-input flex-1 px-4 py-3 text-sm font-mono"
            />
            <button type="submit" className="glass-button-primary px-5 py-3 rounded-2xl text-sm">
              Submit
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-white/30">
            <button type="button" onClick={() => setManualMode(!manualMode)}
              className="text-white/50 hover:text-white/80 transition font-medium">
              {manualMode ? '← Switch to Camera' : 'Switch to Manual Entry'}
            </button>
            <span className="font-mono">Multi-format Scanner</span>
          </div>
        </div>
      </div>
    </div>
  );
}
