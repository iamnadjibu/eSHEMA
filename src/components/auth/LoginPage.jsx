import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, Building, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Send } from 'lucide-react';
import { loginUser, registerUser, resetUserPassword, resendVerificationEmail } from '../../firebase/authService';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('trainer');
  const [regBranch, setRegBranch] = useState('kigali');

  const [forgotEmail, setForgotEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { setErrorMessage('Please enter both Email and Password.'); return; }
    setLoading(true); setErrorMessage(''); setSuccessMessage(''); setNeedsVerification(false);
    try {
      const user = await loginUser(loginEmail, loginPassword);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setErrorMessage('Your email address has not been verified. Please check your inbox.');
        setNeedsVerification(true);
      } else {
        setErrorMessage(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      await resendVerificationEmail();
      setSuccessMessage('A new verification link has been sent to your email.');
      setNeedsVerification(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPassword) { setErrorMessage('Please fill in all required fields.'); return; }
    if (regPassword.length < 6) { setErrorMessage('Password must be at least 6 characters.'); return; }
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const user = await registerUser({ fullName: regFullName, email: regEmail, password: regPassword, department: regDepartment, branch: regBranch, requestedRole: 'staff' });
      setSuccessMessage(user.role === 'super_admin'
        ? 'You are the first user — assigned as SUPER ADMIN. Verify your email to activate.'
        : 'Registration submitted! Awaiting Super Admin approval.');
      setMode('login');
      setLoginEmail(regEmail);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setErrorMessage('Enter your account email.'); return; }
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      await resetUserPassword(forgotEmail);
      setSuccessMessage(`Password reset link sent to ${forgotEmail}.`);
      setMode('login');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (email, role) => {
    onLoginSuccess({ uid: `demo-${role}`, fullName: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, email, role, approved: true, status: 'approved' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white text-black font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-white/10">
            KSP
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">eSHEMA</h1>
            <p className="text-xs text-white/30 mt-1">Staff Management & Barcode Attendance System</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel rounded-[24px] p-7">

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {needsVerification && (
                <button 
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Resend Verification Link
                </button>
              )}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Sign In</h2>
                <p className="text-xs text-white/30 mt-0.5">Enter your credentials to continue</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="email" required placeholder="user@ksp.rw" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-white/50">Password</label>
                  <button type="button" onClick={() => { setMode('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="text-[11px] text-white/40 hover:text-white/70 transition">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="password" required placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 glass-button-primary rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-1">
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-4 border-t border-white/[0.06] text-center">
                <p className="text-xs text-white/30">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setMode('register'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="text-white/70 hover:text-white font-bold transition">Register Here</button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Create Account</h2>
                <p className="text-xs text-white/30 mt-0.5">First verified user becomes Owner</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="text" required placeholder="Jean Claude Karekezi" value={regFullName} onChange={(e) => setRegFullName(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="email" required placeholder="user@ksp.rw" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="password" required minLength={6} placeholder="At least 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Department</label>
                  <select value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)}
                    className="glass-input w-full p-3 text-xs rounded-2xl">
                    <option value="executive">Executive</option>
                    <option value="management">Management</option>
                    <option value="trainer">Trainer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Branch</label>
                  <select value={regBranch} onChange={(e) => setRegBranch(e.target.value)}
                    className="glass-input w-full p-3 text-xs rounded-2xl">
                    <option value="kigali">Kigali</option>
                    <option value="kayonza">Kayonza</option>
                    <option value="elsewhere">Elsewhere</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 glass-button-primary rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-1">
                <span>{loading ? 'Creating...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-white/[0.06] text-center">
                <p className="text-xs text-white/30">
                  Already registered?{' '}
                  <button type="button" onClick={() => { setMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="text-white/70 hover:text-white font-bold transition">Sign In</button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Reset Password</h2>
                <p className="text-xs text-white/30 mt-0.5">We'll send you a reset link</p>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/50 block mb-1.5">Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/25 absolute left-3.5 top-3.5" />
                  <input type="email" required placeholder="user@ksp.rw" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 glass-button-primary rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              </button>
              <div className="pt-3 border-t border-white/[0.06] text-center">
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-xs text-white/40 hover:text-white/70 transition">← Back to Sign In</button>
              </div>
            </form>
          )}
        </div>

        {/* Demo Bypass */}
        <div className="glass-panel rounded-[20px] p-4 text-center">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-white/30" />
            <span>Instant Demo Access</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[['admin@ksp.rw', 'super_admin', 'Super Admin'], ['manager@ksp.rw', 'manager', 'Manager'], ['operator@ksp.rw', 'operator', 'Operator']].map(([email, role, label]) => (
              <button key={role} onClick={() => handleQuickDemo(email, role)}
                className="glass-button py-2.5 rounded-2xl text-xs">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
