import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, AlertCircle, Search, Filter, Edit3, RefreshCw } from 'lucide-react';
import { getTodayAttendance } from '../../services/attendanceService';
import { getTodayDateString, formatTimeString, formatHoursMinutes, formatDateTimeString } from '../../utils/timeUtils';
import CorrectionModal from './CorrectionModal';
import InitialsAvatar from '../common/InitialsAvatar';

export default function AttendanceDashboard() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [correctionTarget, setCorrectionTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getTodayAttendance(targetDate);
    setAttendanceData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Compute metrics
  const totalStaff = attendanceData.length;
  const presentCount = attendanceData.filter(a => a.currentStatus !== 'absent').length;
  const absentCount = totalStaff - presentCount;
  const workingCount = attendanceData.filter(a => a.currentStatus === 'working').length;
  const openSessionsCount = attendanceData.filter(a => a.hasOpenSession).length;
  const totalMinutesSum = attendanceData.reduce((sum, a) => sum + (a.totalMinutesToday || 0), 0);
  const avgMinutes = presentCount > 0 ? Math.round(totalMinutesSum / presentCount) : 0;

  const filteredData = attendanceData.filter(a => {
    const nameMatch = `${a.staffName} ${a.staffCode}`.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || a.currentStatus === statusFilter;
    const deptMatch = deptFilter === 'all' || a.department === deptFilter;
    const branchMatch = branchFilter === 'all' || a.branch === branchFilter;
    return nameMatch && statusMatch && deptMatch && branchMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase">
              Live Monitoring
            </span>
            <span className="text-xs text-slate-400">Date: {targetDate}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            ATTENDANCE DASHBOARD
          </h1>
          <p className="text-sm text-slate-400">Real-time workplace presence, session tracking, and daily totals</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          />
          <button 
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-blue-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Total Staff</p>
          <p className="text-2xl font-black text-white mt-1">{totalStaff}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Present</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{presentCount}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-red-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Absent</p>
          <p className="text-2xl font-black text-red-400 mt-1">{absentCount}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-indigo-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Inside Working</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{workingCount}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Open Sessions</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{openSessionsCount}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-purple-500">
          <p className="text-xs text-slate-400 font-medium uppercase">Avg Hours</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{formatHoursMinutes(avgMinutes)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input 
            type="text"
            placeholder="Search staff or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="working">Currently Working</option>
            <option value="outside">Outside</option>
            <option value="absent">Absent</option>
          </select>

          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none capitalize"
          >
            <option value="all">All Departments</option>
            <option value="executive">Executive</option>
            <option value="management">Management</option>
            <option value="trainer">Trainer</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Live Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Staff Code</th>
                <th className="p-4">First Arrival</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Scan</th>
                <th className="p-4">Total Hours</th>
                <th className="p-4">Sessions</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar 
                        photoUrl={item.staffPhoto}
                        firstName={item.staffName ? item.staffName.split(' ')[0] : ''}
                        lastName={item.staffName ? item.staffName.split(' ').slice(1).join(' ') : ''}
                        size="md"
                      />
                      <div>
                        <p className="font-bold text-white leading-tight">{item.staffName}</p>
                        <p className="text-xs text-slate-400 capitalize">{item.department} • {item.branch}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 font-mono">
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-bold text-blue-300">
                      {item.staffCode}
                    </span>
                  </td>

                  <td className="p-4 text-xs font-mono text-slate-300">
                    {item.firstArrival ? formatTimeString(item.firstArrival) : '-'}
                  </td>

                  <td className="p-4">
                    {item.currentStatus === 'working' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase flex items-center gap-1.5 w-fit">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                        Working
                      </span>
                    ) : item.currentStatus === 'outside' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase w-fit block">
                        Outside
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase w-fit block">
                        Absent
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-xs font-mono text-slate-400">
                    {item.lastScan ? formatTimeString(item.lastScan) : '-'}
                  </td>

                  <td className="p-4 font-bold text-emerald-400">
                    {formatHoursMinutes(item.totalMinutesToday)}
                  </td>

                  <td className="p-4 text-xs font-mono">
                    {item.sessionsCount || 0} session(s)
                  </td>

                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setCorrectionTarget(item)}
                      className="p-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition text-xs font-medium flex items-center gap-1 ml-auto"
                      title="Correct Attendance Record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Correct</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CorrectionModal 
        isOpen={!!correctionTarget}
        attendanceRecord={correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        onCorrected={() => loadData()}
      />
    </div>
  );
}
