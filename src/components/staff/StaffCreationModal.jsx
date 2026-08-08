import React, { useState, useEffect } from 'react';
import { X, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { NATIONALITIES, DEPARTMENTS, GENDERS, EDUCATION_LEVELS, CERTIFICATE_RANGES, BRANCHES } from '../../utils/constants';
import { generateStaffCode } from '../../utils/staffCodeGenerator';
import { createStaff } from '../../services/staffService';
import BarcodeGenerator from '../common/BarcodeGenerator';

export default function StaffCreationModal({ isOpen, onClose, onStaffCreated }) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    genderCode: '8', // default male
    nationalityCode: '1', // default rwandan
    departmentCode: '3', // default trainer
    branchCode: '1', // default kigali
    educationCode: '05', // default masters
    certificateCode: '2', // default 6-10 certs
    jobTitle: '',
    phone: '',
    email: '',
    photoUrl: '',
    emergencyContact: '',
    notes: ''
  });

  const [codePreview, setCodePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update preview code when form selection changes
  useEffect(() => {
    const preview = generateStaffCode({
      nationalityCode: formData.nationalityCode,
      departmentCode: formData.departmentCode,
      genderCode: formData.genderCode,
      educationCode: formData.educationCode,
      certificateCode: formData.certificateCode,
      branchCode: formData.branchCode,
      employeeNumber: 1 // Sample sequence preview
    });
    setCodePreview(preview.replace('-001', '-XXX'));
  }, [formData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.jobTitle.trim()) {
      setErrorMsg('First Name, Last Name, and Job Title are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const created = await createStaff({
        ...formData,
        gender: GENDERS[formData.genderCode].key,
        nationality: NATIONALITIES[formData.nationalityCode].key,
        department: DEPARTMENTS[formData.departmentCode].key,
        branch: BRANCHES[formData.branchCode].key,
        educationLevel: EDUCATION_LEVELS[formData.educationCode].key,
        certificateRange: CERTIFICATE_RANGES[formData.certificateCode].key
      });

      if (onStaffCreated) onStaffCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Create Staff Member</h2>
              <p className="text-xs text-slate-400">System automatically generates unique KSP Staff Code & Barcode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Auto Code Preview Banner */}
          <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto Staff Code Structure</span>
              </div>
              <p className="font-mono text-2xl font-black text-white">{codePreview}</p>
              <p className="text-xs text-slate-400 mt-0.5">Sequential employee number assigned on submit</p>
            </div>
            <div className="shrink-0 bg-white p-1 rounded-lg">
              <BarcodeGenerator value={codePreview.replace('-XXX', '-001')} height={35} width={1} fontSize={10} />
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">1. Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">First Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Jean Claude"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Middle Name</label>
                <input 
                  type="text" 
                  placeholder="Munyaneza"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Last Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Karekezi"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Classification Options */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">2. Classification (Staff Code Encodings)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Nationality</label>
                <select 
                  value={formData.nationalityCode}
                  onChange={(e) => handleChange('nationalityCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(NATIONALITIES).map(n => (
                    <option key={n.code} value={n.code}>[{n.code}] {n.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Department</label>
                <select 
                  value={formData.departmentCode}
                  onChange={(e) => handleChange('departmentCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(DEPARTMENTS).map(d => (
                    <option key={d.code} value={d.code}>[{d.code}] {d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Gender</label>
                <select 
                  value={formData.genderCode}
                  onChange={(e) => handleChange('genderCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(GENDERS).map(g => (
                    <option key={g.code} value={g.code}>[{g.code}] {g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Education Level</label>
                <select 
                  value={formData.educationCode}
                  onChange={(e) => handleChange('educationCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(EDUCATION_LEVELS).map(e => (
                    <option key={e.code} value={e.code}>[{e.code}] {e.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Certificates Range</label>
                <select 
                  value={formData.certificateCode}
                  onChange={(e) => handleChange('certificateCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(CERTIFICATE_RANGES).map(c => (
                    <option key={c.code} value={c.code}>[{c.code}] {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Branch</label>
                <select 
                  value={formData.branchCode}
                  onChange={(e) => handleChange('branchCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(BRANCHES).map(b => (
                    <option key={b.code} value={b.code}>[{b.code}] {b.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Job & Contact Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">3. Employment & Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Job Title *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Drone Technical Instructor"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Phone Number</label>
                <input 
                  type="text"
                  placeholder="+250 788 000 000"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Email Address</label>
                <input 
                  type="email"
                  placeholder="employee@ksp.rw"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Profile Photo URL (Optional)</label>
                <input 
                  type="url"
                  placeholder="https://..."
                  value={formData.photoUrl}
                  onChange={(e) => handleChange('photoUrl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Staff Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
