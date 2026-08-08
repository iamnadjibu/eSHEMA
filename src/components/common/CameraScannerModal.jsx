import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, Keyboard, AlertCircle, SwitchCamera, Scan } from 'lucide-react';
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
  const [facingMode, setFacingMode] = useState('environment');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);

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

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen || manualMode) return;

    const initCamera = async () => {
      // Small delay to ensure DOM is ready
      await new Promise(r => setTimeout(r, 300));
      if (!mountedRef.current) return;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d =>
            /back|rear|environment/i.test(d.label)
          );
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          await startWithCameraId(camId);
        } else {
          await startWithFacingMode(facingMode);
        }
      } catch (err) {
        console.warn("Camera enumeration failed, trying facingMode:", err);
        await startWithFacingMode(facingMode);
      }
    };

    initCamera();
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
    fps: 15,
    qrbox: function(viewfinderWidth, viewfinderHeight) {
      // Use a large proportion of the viewfinder for the scan region
      const w = Math.floor(viewfinderWidth * 0.88);
      const h = Math.floor(viewfinderHeight * 0.55);
      return { width: Math.max(w, 250), height: Math.max(h, 120) };
    },
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
    rememberLastUsedCamera: true,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
  });

  const onDecodeSuccess = useCallback((decodedText) => {
    handleDetectedCode(decodedText);
  }, []);

  const onDecodeError = useCallback(() => {
    // Silent per-frame failure — expected behavior
  }, []);

  const startWithCameraId = async (cameraId) => {
    if (startingRef.current) return;
    startingRef.current = true;
    await stopScanner();

    try {
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

      await html5Qrcode.start(
        cameraId,
        buildConfig(),
        onDecodeSuccess,
        onDecodeError
      );

      if (mountedRef.current) {
        setIsScanning(true);
        setErrorMessage('');
        startingRef.current = false;
        checkTorch();
      }
    } catch (err) {
      console.warn("Camera ID start failed, trying facingMode:", err);
      startingRef.current = false;
      await startWithFacingMode(facingMode);
    }
  };

  const startWithFacingMode = async (mode) => {
    if (startingRef.current) return;
    startingRef.current = true;
    await stopScanner();

    try {
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

      await html5Qrcode.start(
        { facingMode: mode },
        buildConfig(),
        onDecodeSuccess,
        onDecodeError
      );

      if (mountedRef.current) {
        setIsScanning(true);
        setErrorMessage('');
        startingRef.current = false;
        checkTorch();
      }
    } catch (err) {
      startingRef.current = false;
      if (mode === 'environment') {
        setFacingMode('user');
        await startWithFacingMode('user');
      } else {
        if (mountedRef.current) {
          setErrorMessage('Camera unavailable. Grant browser camera permission or use manual entry below.');
          setIsScanning(false);
        }
      }
    }
  };

  const checkTorch = () => {
    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorchSupported(true);
      }
    } catch (e) {}
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

  const switchCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    await stopScanner();
    // Small delay before restarting
    setTimeout(() => startWithFacingMode(newMode), 200);
  };

  const handleDetectedCode = (code) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;
    lastScanTimeRef.current = now;
    if (onScanSuccess) onScanSuccess(code);
  };

  const handleCameraChange = async (e) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    if (newCamId) {
      await stopScanner();
      setTimeout(() => startWithCameraId(newCamId), 200);
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
              <p className="text-[11px] text-white/40">Position barcode within the scanning region</p>
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
              <div className="w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 relative" style={{ minHeight: '280px' }}>
                <div id="reader" className="w-full"></div>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between gap-2 w-full">
                <button type="button" onClick={switchCamera} className="glass-button px-4 py-2 rounded-2xl text-xs flex items-center gap-2">
                  <SwitchCamera className="w-4 h-4 text-white/60" />
                  <span>{facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
                </button>

                {torchSupported && (
                  <button type="button" onClick={toggleTorch}
                    className={`glass-button px-4 py-2 rounded-2xl text-xs flex items-center gap-2 ${torchOn ? 'bg-white/15 border-white/25' : ''}`}>
                    <Zap className={`w-4 h-4 ${torchOn ? 'text-amber-300' : 'text-white/60'}`} />
                    <span>Flash</span>
                  </button>
                )}

                {cameras.length > 1 && (
                  <select value={selectedCameraId} onChange={handleCameraChange}
                    className="glass-input text-xs px-3 py-2 rounded-2xl max-w-[140px] truncate">
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                    ))}
                  </select>
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
