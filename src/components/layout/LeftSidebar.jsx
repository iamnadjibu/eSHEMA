import React, { useState } from 'react';
import { Camera, LayoutDashboard, Users, BarChart2, ShieldCheck, UserCheck, Search, LogOut, Menu, X } from 'lucide-react';
import { ROLES } from '../../utils/constants';
import CameraScannerModal from '../common/CameraScannerModal';

export default function LeftSidebar({ activeTab, setActiveTab, currentUser, onLogout, onGeneralLookupScan }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isGeneralScannerOpen, setIsGeneralScannerOpen] = useState(false);

  const userRole = currentUser?.role || 'staff';

  const navItems = [];
  if (['super_admin', 'manager', 'operator'].includes(userRole)) {
    navItems.push({ id: 'scanner', label: 'Attendance Scanner', icon: Camera });
  }
  navItems.push({ id: 'dashboard', label: 'Live Dashboard', icon: LayoutDashboard });
  
  if (['super_admin', 'manager'].includes(userRole)) {
    navItems.push({ id: 'staff', label: 'Staff Directory', icon: Users });
    navItems.push({ id: 'reports', label: 'Reports', icon: BarChart2 });
    navItems.push({ id: 'audit', label: 'Audit Logs', icon: ShieldCheck });
  }
  if (userRole === 'super_admin') {
    navItems.push({ id: 'users', label: 'User Approvals', icon: UserCheck });
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 no-print glass-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-black font-black flex items-center justify-center text-[11px]">
            KSP
          </div>
          <span className="font-bold text-white text-sm tracking-tight">eSHEMA</span>
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="glass-button p-2 rounded-xl">
          {isMobileOpen ? <X className="w-5 h-5 text-white/70" /> : <Menu className="w-5 h-5 text-white/70" />}
        </button>
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col justify-between p-5 no-print transition-transform duration-300 bg-neutral-950/95 backdrop-blur-2xl border-r border-white/[0.06] ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-black font-black text-sm flex items-center justify-center shadow-lg shadow-white/10">
                KSP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[17px] text-white tracking-tight">eSHEMA</span>
                  <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-white/50 border border-white/10 bg-white/[0.04]">v1.0</span>
                </div>
                <p className="text-[10px] text-white/30 font-medium">Staff & Barcode System</p>
              </div>
            </div>
            <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-1.5 text-white/40 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Staff Lookup */}
          <button
            onClick={() => setIsGeneralScannerOpen(true)}
            className="w-full glass-button py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 text-white/50" />
            <span>Staff Lookup Scan</span>
          </button>

          {/* Navigation */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-2">Navigation</p>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 flex items-center gap-3 ${
                    isActive
                      ? 'bg-white text-black shadow-lg shadow-white/10'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-black' : 'text-white/40'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white/70 shrink-0">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-white text-xs truncate">{currentUser?.fullName || 'Active User'}</p>
              <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{userRole === 'super_admin' ? 'Super Admin' : userRole}</span>
            </div>
          </div>

          <button onClick={onLogout}
            className="w-full glass-button py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 text-white/50 hover:text-red-300 hover:border-red-500/20">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Lookup Scanner Modal */}
      <CameraScannerModal
        isOpen={isGeneralScannerOpen}
        onClose={() => setIsGeneralScannerOpen(false)}
        onScanSuccess={(code) => { setIsGeneralScannerOpen(false); if (onGeneralLookupScan) onGeneralLookupScan(code); }}
        title="Staff Lookup Scanner"
      />
    </>
  );
}
