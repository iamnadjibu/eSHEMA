import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Filter, QrCode, Eye, Edit, Shield, MoreVertical } from 'lucide-react';
import { getAllStaff } from '../../services/staffService';
import StaffCreationModal from './StaffCreationModal';
import StaffCardModal from './StaffCardModal';
import StaffProfileModal from './StaffProfileModal';
import BarcodeGenerator from '../common/BarcodeGenerator';
import InitialsAvatar from '../common/InitialsAvatar';

export default function StaffDirectoryView({ currentUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCardStaff, setSelectedCardStaff] = useState(null);
  const [selectedProfileStaff, setSelectedProfileStaff] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    const data = await getAllStaff();
    setStaffList(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staffList.filter(s => {
    const nameMatch = `${s.firstName} ${s.lastName} ${s.staffCode}`.toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = deptFilter === 'all' || s.department === deptFilter || s.departmentCode === deptFilter;
    const branchMatch = branchFilter === 'all' || s.branch === branchFilter || s.branchCode === branchFilter;
    return nameMatch && deptMatch && branchMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            STAFF DIRECTORY & ID CARDS
          </h1>
          <p className="text-sm text-slate-400">
            Manage staff members, generate Code 128 barcodes, and print identification cards
          </p>
        </div>

        {currentUser?.role === 'super_admin' && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95 shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input 
            type="text"
            placeholder="Search by Name or KSP Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="executive">Executive</option>
            <option value="management">Management</option>
            <option value="trainer">Trainer</option>
            <option value="other">Other</option>
          </select>

          <select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="all">All Branches</option>
            <option value="kigali">Kigali</option>
            <option value="kayonza">Kayonza</option>
            <option value="elsewhere">Elsewhere</option>
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">KSP Staff Code</th>
                <th className="p-4">Department</th>
                <th className="p-4">Branch</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">Loading staff records...</td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No staff members found matching search.</td>
                </tr>
              ) : (
                filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar 
                          photoUrl={staff.photoUrl}
                          firstName={staff.firstName}
                          lastName={staff.lastName}
                          size="md"
                        />
                        <div>
                          <p className="font-bold text-white leading-tight">{staff.firstName} {staff.lastName}</p>
                          <p className="text-xs text-slate-400 capitalize">{staff.jobTitle}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono">
                      <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700/80 text-blue-300 text-xs font-bold">
                        {staff.staffCode}
                      </span>
                    </td>

                    <td className="p-4 capitalize text-slate-300">
                      {staff.department}
                    </td>

                    <td className="p-4 capitalize text-slate-300">
                      {staff.branch}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {staff.employmentStatus}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedCardStaff(staff)}
                          className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition text-xs flex items-center gap-1 font-medium"
                          title="Print Barcode ID Card"
                        >
                          <QrCode className="w-4 h-4" />
                          <span className="hidden sm:inline">ID Card</span>
                        </button>

                        <button 
                          onClick={() => setSelectedProfileStaff(staff)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1 font-medium"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Profile</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <StaffCreationModal 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onStaffCreated={() => fetchStaff()}
      />

      <StaffCardModal 
        isOpen={!!selectedCardStaff}
        staff={selectedCardStaff}
        onClose={() => setSelectedCardStaff(null)}
      />

      <StaffProfileModal 
        isOpen={!!selectedProfileStaff}
        staff={selectedProfileStaff}
        onClose={() => setSelectedProfileStaff(null)}
        currentUser={currentUser}
      />
    </div>
  );
}
