import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, Keyboard, AlertCircle, Scan, Sun, Focus, Move, CheckCircle2, RefreshCw } from 'lucide-react';
import { SCAN_COOLDOWN_MS } from '../../utils/constants';
import { isValidStaffCode } from '../../utils/staffCodeGenerator';

// Prioritized 1D and 2D barcode formats for instant decoding (~1.0s target)
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
];

export default function CameraScannerModal({ isOpen, onClose, onScanSuccess, title = "Scan Staff Barcode" }) {
  const [cameras, setCameras] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [justScanned, setJustScanned] = useState(false);

  // Real-time Barcode Placement & Lighting Feedback State
  const [placementStatus, setPlacementStatus] = useState({
    message: 'Initializing High-Speed Barcode Scanner...',
    type: 'optimal', // 'optimal' | 'info' | 'warning' | 'dark' | 'focus'
    action: 'none'
  });
  const [tapRipple, setTapRipple] = useState(null);

  const html5QrcodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scanStartTimeRef = useRef(0);
  const keyboardBufferRef = useRef('');
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const analyzerCanvasRef = useRef(null);
  const frameAnalyzerIntervalRef = useRef(null);
  const autoFocusIntervalRef = useRef(null);

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
      await new Promise(r => setTimeout(r, 100));
      if (!mountedRef.current) return;
      await startResilientScanner();
    };

    autoStartBestCamera();
    return () => { stopScanner(); };
  }, [isOpen, manualMode]);

  const stopScanner = useCallback(async () => {
    startingRef.current = false;

    if (frameAnalyzerIntervalRef.current) {
      clearInterval(frameAnalyzerIntervalRef.current);
      frameAnalyzerIntervalRef.current = null;
    }
    if (autoFocusIntervalRef.current) {
      clearInterval(autoFocusIntervalRef.current);
      autoFocusIntervalRef.current = null;
    }

    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        // ignore stop error
      }
      try {
        html5QrcodeRef.current.clear();
      } catch (e) {
        // ignore clear error
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
    fps: 30, // 30 FPS high-speed frame sampling for < 1.0s average decode speed
    qrbox: function(viewfinderWidth, viewfinderHeight) {
      const w = Math.min(Math.floor(viewfinderWidth * 0.94), 540);
      const h = Math.min(Math.floor(viewfinderHeight * 0.75), 320);
      return { width: Math.max(w, 240), height: Math.max(h, 130) };
    },
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true // Native browser GPU barcode acceleration
    },
    rememberLastUsedCamera: true,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
    aspectRatio: 1.777778, // Widescreen ratio prevents aspect distortion
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
      setPlacementStatus({
        message: 'Barcode Detected Successfully!',
        type: 'optimal',
        action: 'success'
      });
      setTimeout(() => {
        if (mountedRef.current) setJustScanned(false);
      }, 400);
    }
    handleDetectedCode(decodedText);
  }, []);

  const onDecodeError = useCallback(() => {
    // Silent per-frame decoding attempt — expected behavior
  }, []);

  // Apply continuous auto-focus & WebRTC track constraints
  const applyOptimalCameraConstraints = useCallback(async () => {
    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities();
          const advanced = {};

          if (caps.focusMode && Array.isArray(caps.focusMode)) {
            if (caps.focusMode.includes('continuous')) {
              advanced.focusMode = 'continuous';
            } else if (caps.focusMode.includes('auto')) {
              advanced.focusMode = 'auto';
            }
          }

          if (caps.torch) {
            setTorchSupported(true);
          }

          if (caps.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
            advanced.exposureMode = 'continuous';
          }

          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] });
          }
        }
      }
    } catch (e) {
      // ignore constraint application error
    }
  }, []);

  // Trigger focus pulse (Tap-to-Focus or Periodic Refocusing)
  const triggerFocusPulse = useCallback(async (clickEvt = null) => {
    if (clickEvt) {
      const rect = clickEvt.currentTarget.getBoundingClientRect();
      const x = clickEvt.clientX - rect.left;
      const y = clickEvt.clientY - rect.top;
      setTapRipple({ x, y, id: Date.now() });
      setTimeout(() => {
        if (mountedRef.current) setTapRipple(null);
      }, 700);
    }

    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
        }
      }
    } catch (e) {
      // ignore track error
    }
  }, []);

  // Live Frame Analyzer: Real-time Luminance, Blur, and Placement Guidance
  const analyzeFrameQuality = useCallback(() => {
    const video = document.querySelector('#reader video');
    if (!video || video.readyState < 2) return;

    if (!analyzerCanvasRef.current) {
      analyzerCanvasRef.current = document.createElement('canvas');
      analyzerCanvasRef.current.width = 160;
      analyzerCanvasRef.current.height = 120;
    }

    const canvas = analyzerCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = frameData.data;

    let totalLuminance = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLuminance += l;
    }

    const avgLuminance = totalLuminance / pixelCount;

    // Estimate contrast / variance to evaluate focus sharpness
    let varianceSum = 0;
    for (let i = 0; i < data.length; i += 16) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      varianceSum += Math.abs(l - avgLuminance);
    }
    const avgContrast = varianceSum / (pixelCount / 4);
    const elapsed = Date.now() - scanStartTimeRef.current;

    if (avgLuminance < 42) {
      setPlacementStatus({
        message: 'Too dark — tap Flashlight button to brighten',
        type: 'dark',
        action: 'torch'
      });
    } else if (avgLuminance > 228) {
      setPlacementStatus({
        message: 'Glare detected — tilt staff card slightly',
        type: 'warning',
        action: 'tilt'
      });
    } else if (avgContrast < 8.5 && elapsed > 650) {
      setPlacementStatus({
        message: 'Hold steady — camera auto-focusing...',
        type: 'focus',
        action: 'focus'
      });
    } else if (elapsed > 1600) {
      setPlacementStatus({
        message: 'Barcode unread — move card 10-15cm closer or re-align',
        type: 'warning',
        action: 'distance'
      });
    } else if (elapsed > 700) {
      setPlacementStatus({
        message: 'Center barcode inside the green target box',
        type: 'info',
        action: 'center'
      });
    } else {
      setPlacementStatus({
        message: 'High-Speed Scanner Active • Target ~1.0s',
        type: 'optimal',
        action: 'scanning'
      });
    }
  }, []);

  // Resilient Multi-Tier Camera Startup Sequence
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

    // Camera constraint presets prioritizing environment high-speed 30 FPS stream
    const cameraOptionsToTry = [
      {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      { facingMode: "environment" },
      { facingMode: "user" },
    ];

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
        console.warn("Camera option failed, trying fallback:", cameraOption, err);
      }
    }

    if (startedSuccess && mountedRef.current) {
      setIsScanning(true);
      setErrorMessage('');
      startingRef.current = false;
      scanStartTimeRef.current = Date.now();

      await applyOptimalCameraConstraints();

      // Launch Real-Time Frame Quality & Placement Feedback Analyzer (Runs 10 times/sec)
      if (frameAnalyzerIntervalRef.current) clearInterval(frameAnalyzerIntervalRef.current);
      frameAnalyzerIntervalRef.current = setInterval(analyzeFrameQuality, 100);

      // Periodic Auto-Focus Pulse every 2.5 seconds to ensure sharp camera focus
      if (autoFocusIntervalRef.current) clearInterval(autoFocusIntervalRef.current);
      autoFocusIntervalRef.current = setInterval(() => {
        triggerFocusPulse();
      }, 2500);

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

  // Placement Guidance Badge Style Helper
  const getBadgeStyle = () => {
    switch (placementStatus.type) {
      case 'dark':
        return 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-amber-900/30';
      case 'warning':
        return 'bg-orange-500/20 border-orange-400/40 text-orange-300 shadow-orange-900/30';
      case 'focus':
        return 'bg-sky-500/20 border-sky-400/40 text-sky-300 shadow-sky-900/30';
      case 'info':
        return 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200 shadow-indigo-900/30';
      case 'optimal':
      default:
        return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-emerald-900/30';
    }
  };

  const getBadgeIcon = () => {
    switch (placementStatus.type) {
      case 'dark': return <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
      case 'warning': return <Move className="w-3.5 h-3.5 text-orange-400 animate-bounce" />;
      case 'focus': return <Focus className="w-3.5 h-3.5 text-sky-400 animate-spin" />;
      case 'info': return <Scan className="w-3.5 h-3.5 text-indigo-400" />;
      case 'optimal':
      default: return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

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
              <p className="text-[11px] text-white/40">Point camera at staff barcode (Avg ~1.0s scan)</p>
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
              {/* Camera Viewfinder (Supports Tap-to-Focus) */}
              <div
                onClick={triggerFocusPulse}
                title="Click or tap to focus camera"
                className={`w-full rounded-2xl overflow-hidden border transition-all duration-200 bg-black/60 relative cursor-pointer ${
                  justScanned ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)]' : 'border-white/[0.08]'
                }`} style={{ minHeight: '290px' }}
              >
                <div id="reader" className="w-full"></div>

                {/* Tap-to-Focus Visual Ripple Ring */}
                {tapRipple && (
                  <div
                    className="absolute w-12 h-12 border-2 border-sky-400 rounded-full animate-ping pointer-events-none z-40 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: tapRipple.x, top: tapRipple.y }}
                  />
                )}

                {/* Flash/Torch Toggle Button Overlay */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleTorch(); }}
                    className={`absolute top-3 right-3 z-40 glass-button p-2.5 rounded-2xl transition ${
                      torchOn ? 'bg-amber-500/30 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-white/70'
                    }`}
                    title={torchOn ? "Turn flashlight off" : "Turn flashlight on for low light"}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                {/* Manual Refocus Button Overlay */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); triggerFocusPulse(e); }}
                  className="absolute top-3 left-3 z-40 glass-button p-2.5 rounded-2xl text-white/70 hover:text-sky-300 transition"
                  title="Auto-Focus Camera"
                >
                  <Focus className="w-4 h-4" />
                </button>

                {/* Animated Scanner Laser & Corner Brackets */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
                    <div className="scanner-corner scanner-corner-tl" />
                    <div className="scanner-corner scanner-corner-tr" />
                    <div className="scanner-corner scanner-corner-bl" />
                    <div className="scanner-corner scanner-corner-br" />

                    <div className="scanner-laser-line">
                      <div className="scanner-laser-beam" />
                    </div>

                    {/* Real-time Barcode Placement & Lighting Feedback Badge */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[92%] px-3.5 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 shadow-lg transition-all duration-300 z-30">
                      {getBadgeIcon()}
                      <span className="text-[11px] font-mono font-semibold tracking-wide truncate">
                        {placementStatus.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tap to Focus Helper Hint */}
              <p className="text-[10px] text-white/35 font-medium flex items-center gap-1">
                <Focus className="w-3 h-3 text-sky-400 shrink-0" />
                <span>Tap camera box anytime to auto-focus</span>
              </p>
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
            <span className="font-mono">Avg ~1.0s Speed Scanner</span>
          </div>
        </div>
      </div>
    </div>
  );
}

