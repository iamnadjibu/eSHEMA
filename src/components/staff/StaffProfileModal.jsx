import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Award, Clock, Star, RefreshCw, QrCode, Phone, Mail, Calendar, ShieldAlert } from 'lucide-react';
import BarcodeGenerator from '../common/BarcodeGenerator';
import { calculateAttendanceMetrics, getPerformanceRating, savePerformanceRating } from '../../services/performanceService';
import { getStaffMonthlyHours } from '../../services/attendanceService';
import { parseStaffCode } from '../../utils/staffCodeGenerator';
import InitialsAvatar from '../common/InitialsAvatar';

export default function StaffProfileModal({ staff, isOpen, onClose, onUpdateStaff }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [performanceData, setPerformanceData] = useState(null);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [ratingScores, setRatingScores] = useState({
    punctuality: 9,
    productivity: 9,
    professionalism: 9,
    qualityOfWork: 9,
    teamwork: 9,
    notes: ''
  });
  const [actualHours, setActualHours] = useState(0);

  useEffect(() => {
    if (staff) {
      const existing = getPerformanceRating(staff.id);
      setPerformanceData(existing);
      if (existing) {
        setRatingScores({ ...existing.scores, notes: existing.notes || '' });
      }
      
      const now = new Date();
      getStaffMonthlyHours(staff.id, now.getFullYear(), now.getMonth() + 1).then(hours => {
        setActualHours(hours);
      });
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const codeDetails = parseStaffCode(staff.staffCode);
  const attendanceMetrics = calculateAttendanceMetrics(actualHours);

  const handleSaveRating = async (e) => {
    e.preventDefault();
    const saved = await savePerformanceRating({
      staffId: staff.id,
      punctuality: Number(ratingScores.punctuality),
      productivity: Number(ratingScores.productivity),
      professionalism: Number(ratingScores.professionalism),
      qualityOfWork: Number(ratingScores.qualityOfWork),
      teamwork: Number(ratingScores.teamwork),
      notes: ratingScores.notes
    });
    setPerformanceData(saved);
    setIsEditingRating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-6">
        {/* Profile Banner */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-900/60 p-6 border-b border-slate-800 relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <InitialsAvatar 
              photoUrl={staff.photoUrl}
              firstName={staff.firstName}
              lastName={staff.lastName}
              size="xl"
              className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-slate-800 shadow-xl"
            />
            <div className="text-center sm:text-left space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                {staff.employmentStatus}
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {staff.firstName} {staff.middleName} {staff.lastName}
              </h2>
              <p className="text-sm text-blue-400 font-medium capitalize">{staff.jobTitle}</p>
              <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs bg-slate-950 px-3 py-1 rounded-lg border border-slate-700 text-slate-200">
                  {staff.staffCode}
                </span>
                <span className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 capitalize">
                  {staff.branch} Branch
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'profile' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Full Profile
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'attendance' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Attendance Rating ({attendanceMetrics.rating}/10)
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'performance' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Performance Rating ({performanceData ? `${performanceData.overallPerformanceRating}/10` : 'Not Rated'})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Code Barcode */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Code 128 Staff Barcode</h4>
                  <p className="font-mono text-lg font-bold text-white">{staff.staffCode}</p>
                  <p className="text-xs text-slate-500">Internal Permanent ID: {staff.id}</p>
                </div>
                <div className="bg-white p-1 rounded-lg">
                  <BarcodeGenerator value={staff.staffCode} height={45} width={1.2} fontSize={10} />
                </div>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-2xl">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Personal Info</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Gender:</span><span className="text-white capitalize">{staff.gender}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Nationality:</span><span className="text-white capitalize">{staff.nationality}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="text-white">{staff.phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-white">{staff.email || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Employment & Education</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Department:</span><span className="text-white capitalize">{codeDetails.department}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Branch:</span><span className="text-white capitalize">{codeDetails.branch}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Education:</span><span className="text-white capitalize">{codeDetails.educationLevel}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Certificates:</span><span className="text-white capitalize">{codeDetails.certificateRange}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-blue-950/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">ATTENDANCE RATING</h4>
                  <p className="text-3xl font-black text-white mt-1">{attendanceMetrics.rating} <span className="text-lg font-medium text-slate-400">/ 10</span></p>
                  <p className="text-xs text-slate-400 mt-1">Based on {attendanceMetrics.percentage}% days present out of 22 expected working days</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-extrabold text-xl">
                  {attendanceMetrics.percentage}%
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase">Days Present</p>
                  <p className="text-xl font-bold text-emerald-400">20</p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase">Days Absent</p>
                  <p className="text-xl font-bold text-red-400">2</p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase">Late Arrivals</p>
                  <p className="text-xl font-bold text-amber-400">1</p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase">Monthly Hours</p>
                  <p className="text-xl font-bold text-blue-400">162h</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">JOB PERFORMANCE RATING</h4>
                  <p className="text-3xl font-black text-white mt-1">
                    {performanceData ? `${performanceData.overallPerformanceRating} / 10` : 'Not Rated'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {performanceData ? `Evaluated by ${performanceData.evaluatorEmail}` : 'No performance score entered by management.'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsEditingRating(!isEditingRating)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-purple-600/30"
                >
                  {isEditingRating ? 'Cancel' : performanceData ? 'Edit Rating' : 'Assign Rating'}
                </button>
              </div>

              {isEditingRating ? (
                <form onSubmit={handleSaveRating} className="glass-card p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Manager Evaluation (0 - 10 Score)</h4>
                  {['punctuality', 'productivity', 'professionalism', 'qualityOfWork', 'teamwork'].map(cat => (
                    <div key={cat} className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-slate-300 capitalize">{cat.replace(/([A-Z])/g, ' $1')}:</span>
                      <input 
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={ratingScores[cat]}
                        onChange={(e) => setRatingScores({ ...ratingScores, [cat]: e.target.value })}
                        className="w-20 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                      />
                    </div>
                  ))}
                  <textarea
                    placeholder="Evaluation notes..."
                    value={ratingScores.notes}
                    onChange={(e) => setRatingScores({ ...ratingScores, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 mt-2"
                  ></textarea>
                  <button type="submit" className="w-full py-2 bg-purple-600 text-white font-bold text-xs rounded-xl">
                    Save Evaluation
                  </button>
                </form>
              ) : performanceData ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(performanceData.scores).map(([k, v]) => (
                    <div key={k} className="glass-card p-3 rounded-xl flex justify-between">
                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-bold text-purple-300">{v} / 10</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
