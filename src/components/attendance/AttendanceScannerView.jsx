import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, LogOut, LogIn, AlertTriangle, Clock, Volume2, VolumeX, Scan } from 'lucide-react';
import { processAttendanceScan } from '../../services/attendanceService';
import CameraScannerModal from '../common/CameraScannerModal';
import InitialsAvatar from '../common/InitialsAvatar';

export default function AttendanceScannerView() {
  const [lastScanResult, setLastScanResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const resetTimerRef = useRef(null);

  const playAudioChime = (type) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'IN') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
      } else if (type === 'OUT') {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      }
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
  };

  const handleScanCode = async (code) => {
    if (!code || isProcessing) return;
    setIsProcessing(true);
    setErrorResult(null);
    try {
      const res = await processAttendanceScan(code);
      setLastScanResult(res);
      playAudioChime(res.type);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setLastScanResult(null), 4500);
    } catch (err) {
      setErrorResult(err.message || 'Error processing scan');
      playAudioChime('ERROR');
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setErrorResult(null), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) { handleScanCode(manualInput.trim()); setManualInput(''); }
  };

  useEffect(() => {
    return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-[20px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold uppercase tracking-wider border border-white/[0.08]">
              Live Station
            </span>
            <span className="text-[11px] text-white/30">Africa/Kigali</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            ATTENDANCE SCANNER
          </h1>
          <p className="text-sm text-white/35 mt-0.5">Scan KSP Staff Barcode to Clock IN / OUT</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`glass-button p-3 rounded-2xl flex items-center gap-2 text-sm ${soundEnabled ? 'text-white/70' : 'text-white/30'}`}>
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="hidden sm:inline text-xs font-medium">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <button onClick={() => setIsScannerOpen(true)}
            className="glass-button-primary px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2.5">
            <Scan className="w-5 h-5" />
            <span>SCAN STAFF ID</span>
          </button>
        </div>
      </div>

      {/* Result Display */}
      {lastScanResult ? (
        <div className={`p-8 rounded-[24px] border transition-all duration-300 shadow-2xl ${
          lastScanResult.type === 'IN'
            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-900/20'
            : 'bg-white/[0.04] border-white/20 shadow-white/5'
        }`}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <InitialsAvatar
                photoUrl={lastScanResult.staff.photoUrl}
                firstName={lastScanResult.staff.firstName}
                lastName={lastScanResult.staff.lastName}
                size="xl"
                className="w-32 h-32 md:w-40 md:h-40 border-2 border-white/20 shadow-xl rounded-3xl"
              />
              <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl text-white font-bold text-xs uppercase flex items-center gap-1 shadow-lg ${
                lastScanResult.type === 'IN' ? 'bg-emerald-500' : 'bg-white/20 backdrop-blur-md border border-white/30'
              }`}>
                {lastScanResult.type === 'IN' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>{lastScanResult.type === 'IN' ? 'IN' : 'OUT'}</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/10">
                {lastScanResult.type === 'IN' ? 'CLOCKED IN' : 'CLOCKED OUT'}
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                {lastScanResult.staff.firstName} {lastScanResult.staff.lastName}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-white/50">
                <span className="font-mono bg-white/[0.06] px-2.5 py-0.5 rounded-xl border border-white/[0.08]">{lastScanResult.staff.staffCode}</span>
                <span>•</span>
                <span className="capitalize">{lastScanResult.staff.jobTitle || lastScanResult.staff.department}</span>
                <span>•</span>
                <span className="capitalize">{lastScanResult.staff.branch}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                <div className="glass-card p-3 rounded-2xl">
                  <p className="text-[10px] text-white/40 uppercase">Time</p>
                  <p className="text-xl font-bold text-white">{lastScanResult.timestamp}</p>
                </div>
                {lastScanResult.type === 'OUT' && (
                  <div className="glass-card p-3 rounded-2xl">
                    <p className="text-[10px] text-white/40 uppercase">Session</p>
                    <p className="text-xl font-bold text-white">{lastScanResult.sessionDuration}</p>
                  </div>
                )}
                <div className="glass-card p-3 rounded-2xl col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-white/40 uppercase">Total Today</p>
                  <p className="text-xl font-bold text-emerald-400">{lastScanResult.totalHoursToday}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : errorResult ? (
        <div className="p-8 glass-panel rounded-[24px] border-red-500/20 text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">SCAN ERROR</h3>
          <p className="text-base text-white/50 max-w-md mx-auto">{errorResult}</p>
          <p className="text-xs text-white/20">Resetting automatically...</p>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[24px] text-center flex flex-col items-center justify-center space-y-6 min-h-[340px]">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl glass-button flex items-center justify-center">
              <Camera className="w-12 h-12 text-white/40 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-950 animate-ping" />
          </div>

          <div className="max-w-md space-y-1">
            <h3 className="text-xl font-bold text-white">SCANNER READY</h3>
            <p className="text-sm text-white/35">
              Click <span className="text-white/70 font-semibold">SCAN STAFF ID</span> to launch camera or use a handheld USB scanner.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="w-full max-w-md flex gap-2">
            <input type="text" placeholder="Or enter Staff Code (e.g. KSP-137-052-1025)..."
              value={manualInput} onChange={(e) => setManualInput(e.target.value)}
              className="glass-input flex-1 px-4 py-3 text-sm font-mono" />
            <button type="submit" disabled={isProcessing}
              className="glass-button px-5 py-3 rounded-2xl text-sm font-medium">
              Scan
            </button>
          </form>
        </div>
      )}

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => { setIsScannerOpen(false); handleScanCode(code); }}
        title="Attendance Scanner — Entrance Desk"
      />
    </div>
  );
}
