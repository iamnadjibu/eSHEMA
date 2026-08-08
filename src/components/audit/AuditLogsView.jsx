import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, FileText } from 'lucide-react';
import { getAuditLogs } from '../../services/auditService';
import { formatDateTimeString } from '../../utils/timeUtils';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const data = await getAuditLogs();
      setLogs(data);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">IMMUTABLE AUDIT TRAIL</h1>
          </div>
          <p className="text-sm text-slate-400">Complete historical log of all staff creations, code reissues, and attendance corrections</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Target ID</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">Loading audit history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition text-xs font-mono">
                    <td className="p-4 text-slate-400 whitespace-nowrap">{formatDateTimeString(log.timestamp)}</td>
                    <td className="p-4 font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase border ${
                        log.action === 'ATTENDANCE_CORRECTION' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        log.action === 'CREATE_STAFF' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{log.actorEmail}</td>
                    <td className="p-4 text-slate-400">{log.targetId}</td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
