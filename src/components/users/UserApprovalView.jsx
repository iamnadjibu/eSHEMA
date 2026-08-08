import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getAllUsers, approveUserStatus } from '../../firebase/authService';
import { ROLES } from '../../utils/constants';

export default function UserApprovalView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (uid, role) => {
    setActionMessage('');
    try {
      await approveUserStatus(uid, role, true, currentUser?.email || 'owner@ksp.rw');
      setActionMessage(`User approved successfully with assigned role: ${role.toUpperCase()}.`);
      fetchUsers();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    }
  };

  const handleReject = async (uid) => {
    setActionMessage('');
    try {
      await approveUserStatus(uid, 'staff', false, currentUser?.email || 'admin@ksp.rw');
      setActionMessage(`User registration rejected.`);
      fetchUsers();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Super Admin Privileges</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            USER REGISTRATION APPROVALS
          </h1>
          <p className="text-sm text-slate-400">Review pending user signups and authorize system access roles</p>
        </div>

        <button 
          onClick={fetchUsers}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
          title="Refresh Users List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-2xl flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Department & Branch</th>
                <th className="p-4">Status</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">Loading user accounts...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No registered users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-bold text-white">
                      {user.fullName || 'User'}
                    </td>
                    <td className="p-4 font-mono text-slate-300 text-xs">
                      <div>{user.email}</div>
                      {user.emailVerified ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Email Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs capitalize text-slate-400">
                      {user.department || 'trainer'} • {user.branch || 'kigali'}
                    </td>
                    <td className="p-4">
                      {user.approved ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                        ROLES[user.role?.toUpperCase()]?.color || 'bg-slate-800 text-slate-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {user.role === 'super_admin' ? (
                        <span className="text-xs text-purple-400 font-bold italic">Super Admin</span>
                      ) : !user.approved ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(user.uid, 'manager')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                          >
                            Approve Manager
                          </button>
                          <button 
                            onClick={() => handleApprove(user.uid, 'operator')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                          >
                            Approve Operator
                          </button>
                          <button 
                            onClick={() => handleApprove(user.uid, 'staff')}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                          >
                            Approve Staff
                          </button>
                          <button 
                            onClick={() => handleReject(user.uid)}
                            className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold rounded-xl border border-red-800 transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Access Active</span>
                      )}
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
