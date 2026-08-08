import React, { useState } from 'react';
import { Camera, LayoutDashboard, Users, BarChart2, ShieldCheck, Search, ChevronDown, UserCheck } from 'lucide-react';
import { ROLES } from '../../utils/constants';
import CameraScannerModal from '../common/CameraScannerModal';

export default function Navbar({ activeTab, setActiveTab, activeRole, setActiveRole, onGeneralLookupScan }) {
  const [isGeneralScannerOpen, setIsGeneralScannerOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navItems = [
    { id: 'scanner', label: 'Attendance Scanner', icon: Camera, highlight: true },
    { id: 'dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('scanner')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black flex items-center justify-center text-lg shadow-lg shadow-blue-600/30 border border-white/10">
              KSP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight leading-none font-sans">eSHEMA</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 uppercase">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Barcode & Staff Attendance</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isActive 
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* General Lookup Scanner Button */}
            <button
              onClick={() => setIsGeneralScannerOpen(true)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
              title="General Staff Lookup Scanner (Does not alter attendance)"
            >
              <Search className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Staff Lookup Scan</span>
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${ROLES[activeRole.toUpperCase()]?.color || 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="capitalize">{activeRole}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Switch User Role
                  </div>
                  {Object.values(ROLES).map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRole(r.id);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition flex items-center justify-between hover:bg-slate-800 ${
                        activeRole === r.id ? 'text-blue-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/60 no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* General Staff Lookup Scanner Modal */}
      <CameraScannerModal 
        isOpen={isGeneralScannerOpen}
        onClose={() => setIsGeneralScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsGeneralScannerOpen(false);
          if (onGeneralLookupScan) onGeneralLookupScan(code);
        }}
        title="General Staff Lookup Scanner"
      />
    </header>
  );
}
