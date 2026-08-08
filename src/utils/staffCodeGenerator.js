import { 
  NATIONALITIES, 
  DEPARTMENTS, 
  GENDERS, 
  EDUCATION_LEVELS, 
  CERTIFICATE_RANGES, 
  BRANCHES 
} from './constants';

/**
 * Validates a Staff Code string format (KSP-XXX-XXX-XXXX)
 * @param {string} code 
 * @returns {boolean}
 */
export function isValidStaffCode(code) {
  if (!code || typeof code !== 'string') return false;
  const regex = /^KSP-[12][1-4][78]-[0-9]{2}[0-3]-[1-3][0-9]{3}$/;
  return regex.test(code.trim().toUpperCase());
}

/**
 * Formats a 3-digit employee sequence number (e.g. 25 -> "025")
 * @param {number|string} seq 
 * @returns {string}
 */
export function formatSeqNumber(seq) {
  const num = parseInt(seq, 10) || 1;
  return num.toString().padStart(3, '0');
}

/**
 * Constructs the KSP Staff Code from individual parameters
 */
export function generateStaffCode({
  nationalityCode, // '1' or '2'
  departmentCode,  // '1', '2', '3', '4'
  genderCode,      // '7' or '8'
  educationCode,   // '00', '01', '02', '05', '10'
  certificateCode, // '0', '1', '2', '3'
  branchCode,      // '1', '2', '3'
  employeeNumber   // e.g. 25 -> "025"
}) {
  const part1 = `${nationalityCode}${departmentCode}${genderCode}`;
  const part2 = `${educationCode}${certificateCode}`;
  const seqPadded = formatSeqNumber(employeeNumber);
  const part3 = `${branchCode}${seqPadded}`;
  
  return `KSP-${part1}-${part2}-${part3}`;
}

/**
 * Parses a KSP Staff Code into detailed metadata
 * @param {string} staffCode 
 */
export function parseStaffCode(staffCode) {
  if (!isValidStaffCode(staffCode)) {
    return { valid: false, error: 'Invalid Staff Code format. Must be KSP-XXX-XXX-XXXX' };
  }

  const parts = staffCode.trim().toUpperCase().split('-');
  const part1 = parts[1]; // XXX
  const part2 = parts[2]; // XXC
  const part3 = parts[3]; // BXXX

  const nationalityDigit = part1[0];
  const departmentDigit = part1[1];
  const genderDigit = part1[2];

  const educationDigits = part2.substring(0, 2);
  const certificateDigit = part2[2];

  const branchDigit = part3[0];
  const employeeSeq = parseInt(part3.substring(1), 10);

  return {
    valid: true,
    staffCode,
    nationality: NATIONALITIES[nationalityDigit]?.label || 'Unknown',
    department: DEPARTMENTS[departmentDigit]?.label || 'Unknown',
    gender: GENDERS[genderDigit]?.label || 'Unknown',
    educationLevel: EDUCATION_LEVELS[educationDigits]?.label || 'Unknown',
    certificateRange: CERTIFICATE_RANGES[certificateDigit]?.label || 'Unknown',
    branch: BRANCHES[branchDigit]?.label || 'Unknown',
    employeeNumber: employeeSeq,
    raw: {
      nationalityDigit,
      departmentDigit,
      genderDigit,
      educationDigits,
      certificateDigit,
      branchDigit,
      employeeSeq
    }
  };
}
