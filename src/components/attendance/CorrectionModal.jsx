import React, { useState } from 'react';
import { X, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { correctAttendanceSession } from '../../services/attendanceService';

export default function CorrectionModal({ isOpen, onClose, attendanceRecord, onCorrected }) {
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !attendanceRecord) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setErrorMsg('A detailed reason (minimum 5 characters) is required for audit records.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Build ISO timestamps if times entered
      const dateStr = attendanceRecord.date;
      const isoIn = clockInTime ? `${dateStr}T${clockInTime}:00` : null;
      const isoOut = clockOutTime ? `${dateStr}T${clockOutTime}:00` : null;

      await correctAttendanceSession({
        staffId: attendanceRecord.staffId,
        date: dateStr,
        sessionId: attendanceRecord.sessions?.[0]?.id || `sess-${Date.now()}`,
        newClockIn: isoIn,
        newClockOut: isoOut,
        reason,
        actorEmail: 'manager@ksp.rw'
      });

      if (onCorrected) onCorrected();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Correction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Administrative Correction</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <p className="text-slate-400">Staff Member:</p>
            <p className="font-bold text-white text-sm">{attendanceRecord.staffName}</p>
            <p className="font-mono text-blue-400">{attendanceRecord.staffCode}</p>
            <p className="text-slate-400 mt-1">Date: <span className="text-white font-medium">{attendanceRecord.date}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Clock IN Time</label>
              <input 
                type="time" 
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Clock OUT Time</label>
              <input 
                type="time" 
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Mandatory Audit Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Employee forgot to scan out due to emergency client meeting..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-3 focus:border-amber-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/20"
            >
              {isSubmitting ? 'Saving...' : 'Submit Audit Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
