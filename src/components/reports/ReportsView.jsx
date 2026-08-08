import React, { useState, useEffect } from 'react';
import { Download, Printer, BarChart3, FileSpreadsheet, Calendar, Building, Award } from 'lucide-react';
import { getAllStaff } from '../../services/staffService';
import { getTodayAttendance } from '../../services/attendanceService';
import { calculateAttendanceMetrics, getPerformanceRating } from '../../services/performanceService';
import { formatHoursMinutes } from '../../utils/timeUtils';

export default function ReportsView() {
  const [reportType, setReportType] = useState('summary');
  const [staffList, setStaffList] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const staff = await getAllStaff();
      const attendance = await getTodayAttendance();
      setStaffList(staff);
      setAttendanceData(attendance);
      setLoading(false);
    }
    load();
  }, []);

  const handleExportCSV = () => {
    const headers = ["Staff Code", "Name", "Department", "Branch", "Days Present", "Attendance Rating (/10)", "Performance Rating (/10)", "Total Hours Today"];
    const rows = staffList.map(s => {
      const att = attendanceData.find(a => a.staffId === s.id);
      const attMetrics = calculateAttendanceMetrics(20, 22);
      const perf = getPerformanceRating(s.id);
      return [
        s.staffCode,
        `"${s.firstName} ${s.lastName}"`,
        s.department,
        s.branch,
        "20/22",
        `${attMetrics.rating}/10`,
        perf ? `${perf.overallPerformanceRating}/10` : "Not Rated",
        att ? formatHoursMinutes(att.totalMinutesToday) : "0h 00m"
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KSP_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            REPORTS & ANALYTICS
          </h1>
          <p className="text-sm text-slate-400">Generate, review, and export staff attendance & performance metrics</p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl printable-area">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base">Master Attendance & Performance Report</h3>
            <p className="text-xs text-slate-400">Schedule Baseline: Mon-Thu (2h), Fri (0h - Off Day), Sat-Sun (4h) [~70h/month]</p>
          </div>
          <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
            Africa/Kigali Timezone
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Staff Code</th>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Branch</th>
                <th className="p-4">Attendance %</th>
                <th className="p-4">Attendance Rating</th>
                <th className="p-4">Performance Rating</th>
                <th className="p-4 text-right">Hours Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {staffList.map(s => {
                const att = attendanceData.find(a => a.staffId === s.id);
                const attMetrics = calculateAttendanceMetrics(20, 22);
                const perf = getPerformanceRating(s.id);

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-blue-300 text-xs">{s.staffCode}</td>
                    <td className="p-4 font-bold text-white">{s.firstName} {s.lastName}</td>
                    <td className="p-4 capitalize">{s.department}</td>
                    <td className="p-4 capitalize">{s.branch}</td>
                    <td className="p-4 text-emerald-400 font-bold">{attMetrics.percentage}%</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                        {attMetrics.rating} / 10
                      </span>
                    </td>
                    <td className="p-4">
                      {perf ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                          {perf.overallPerformanceRating} / 10
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Not Rated</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-200">
                      {att ? formatHoursMinutes(att.totalMinutesToday) : '0h 00m'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
