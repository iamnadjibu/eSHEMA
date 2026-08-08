// KSP Classification Constants according to eshema.skills specification

export const NATIONALITIES = {
  '1': { code: '1', label: 'Rwandan', key: 'rwandan' },
  '2': { code: '2', label: 'Foreigner', key: 'foreigner' }
};

export const DEPARTMENTS = {
  '1': { code: '1', label: 'Executive', key: 'executive' },
  '2': { code: '2', label: 'Management', key: 'management' },
  '3': { code: '3', label: 'Trainer', key: 'trainer' },
  '4': { code: '4', label: 'Other', key: 'other' }
};

export const GENDERS = {
  '7': { code: '7', label: 'Female', key: 'female' },
  '8': { code: '8', label: 'Male', key: 'male' }
};

export const EDUCATION_LEVELS = {
  '00': { code: '00', label: "Bachelor's Degree", key: 'bachelor' },
  '01': { code: '01', label: 'A2 [Highschool]', key: 'highschool' },
  '02': { code: '02', label: 'A1', key: 'a1' },
  '05': { code: '05', label: "Master's Degree", key: 'master' },
  '10': { code: '10', label: 'PhD', key: 'phd' }
};

export const CERTIFICATE_RANGES = {
  '0': { code: '0', label: '0 certificates', key: '0' },
  '1': { code: '1', label: '1–5 certificates', key: '1-5' },
  '2': { code: '2', label: '6–10 certificates', key: '6-10' },
  '3': { code: '3', label: '11+ certificates', key: '11+' }
};

export const BRANCHES = {
  '1': { code: '1', label: 'Kigali', key: 'kigali' },
  '2': { code: '2', label: 'Kayonza', key: 'kayonza' },
  '3': { code: '3', label: 'Elsewhere', key: 'elsewhere' }
};

export const ROLES = {
  SUPER_ADMIN: { id: 'super_admin', label: 'Super Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  MANAGER: { id: 'manager', label: 'Manager', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  ACCOUNTANT: { id: 'accountant', label: 'Accountant', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  OPERATOR: { id: 'operator', label: 'Attendance Operator', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  STAFF: { id: 'staff', label: 'Staff Member', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
};

export const DEFAULT_TIMEZONE = 'Africa/Kigali';
export const SCAN_COOLDOWN_MS = 3000;
