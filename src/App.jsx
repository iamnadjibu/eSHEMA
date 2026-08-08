import React, { useState, useEffect } from 'react';
import LoginPage from './components/auth/LoginPage';
import LeftSidebar from './components/layout/LeftSidebar';
import AttendanceScannerView from './components/attendance/AttendanceScannerView';
import AttendanceDashboard from './components/attendance/AttendanceDashboard';
import StaffDirectoryView from './components/staff/StaffDirectoryView';
import ReportsView from './components/reports/ReportsView';
import AuditLogsView from './components/audit/AuditLogsView';
import UserApprovalView from './components/users/UserApprovalView';
import StaffProfileModal from './components/staff/StaffProfileModal';
import { getStaffByCode } from './services/staffService';
import { logoutUser } from './firebase/authService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');
  const [lookupStaff, setLookupStaff] = useState(null);

  // Restore session from localStorage if present
  useEffect(() => {
    const savedUser = localStorage.getItem('eshema_active_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('eshema_active_user', JSON.stringify(user));
    setActiveTab('scanner');
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem('eshema_active_user');
  };

  const handleGeneralLookupScan = async (code) => {
    try {
      const staff = await getStaffByCode(code);
      if (staff) {
        setLookupStaff(staff);
      } else {
        alert(`Staff ID "${code}" not recognized in database.`);
      }
    } catch (err) {
      alert(`Error looking up staff ID: ${err.message}`);
    }
  };

  // Default Landing Page: Render Login Page when unauthenticated
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex bg-neutral-950 text-white selection:bg-white/20 selection:text-white font-sans">
      {/* Left Sidebar Navigation */}
      <LeftSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onGeneralLookupScan={handleGeneralLookupScan}
      />

      {/* Main Content Stage */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-h-screen">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'scanner' && <AttendanceScannerView />}
          {activeTab === 'dashboard' && <AttendanceDashboard />}
          {activeTab === 'staff' && <StaffDirectoryView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'audit' && <AuditLogsView />}
          {activeTab === 'users' && <UserApprovalView currentUser={currentUser} />}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] bg-neutral-950 py-6 text-center text-xs text-white/20 no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 KSP Enterprise • eSHEMA Staff & Barcode Attendance System</p>
            <p className="font-mono text-white/10">Africa/Kigali Timezone • Firebase Auth & Realtime DB</p>
          </div>
        </footer>
      </div>

      {/* General Staff Lookup Drawer Modal */}
      <StaffProfileModal 
        isOpen={!!lookupStaff}
        staff={lookupStaff}
        onClose={() => setLookupStaff(null)}
      />
    </div>
  );
}
