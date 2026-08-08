import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateStaffCode } from '../utils/staffCodeGenerator';
import { createAuditLog } from './auditService';

function sanitizeRecord(obj) {
  const clean = {};
  Object.keys(obj).forEach(key => {
    clean[key] = obj[key] === undefined ? '' : obj[key];
  });
  return clean;
}

/**
 * Gets all staff members directly from Firestore
 */
export async function getAllStaff() {
  try {
    const staffCol = collection(db, 'staff');
    const snapshot = await getDocs(staffCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error fetching staff from Firestore:", err.message);
    throw err;
  }
}

/**
 * Finds staff by Staff Code (e.g. KSP-137-052-1025) or Document ID directly in Firestore
 */
export async function getStaffByCode(staffCode) {
  if (!staffCode) return null;
  const normalizedCode = staffCode.trim().toUpperCase();

  try {
    // 1. Try querying staffCode in Firestore
    const q = query(collection(db, 'staff'), where('staffCode', '==', normalizedCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // 2. Try fetching document by ID directly in Firestore
    const docRef = doc(db, 'staff', staffCode.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (err) {
    console.error("Firestore lookup error:", err.message);
  }

  return null;
}

/**
 * Finds staff by internal ID directly in Firestore
 */
export async function getStaffById(staffId) {
  if (!staffId) return null;
  try {
    const docRef = doc(db, 'staff', staffId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (err) {
    console.error("Firestore getById error:", err.message);
  }

  return null;
}

/**
 * Gets the next sequential employee number for a given branch ('1'=Kigali, '2'=Kayonza, '3'=Elsewhere)
 */
export async function getNextEmployeeNumber(branchCode) {
  const branchKeyMap = { '1': 'kigali', '2': 'kayonza', '3': 'elsewhere' };
  const branchKey = branchKeyMap[branchCode] || 'kigali';

  try {
    const counterRef = doc(db, 'counters', 'branch_counters');
    const nextSeq = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentVal = 0;
      if (counterDoc.exists()) {
        currentVal = counterDoc.data()[branchKey] || 0;
      }
      const newVal = currentVal + 1;
      transaction.set(counterRef, { [branchKey]: newVal }, { merge: true });
      return newVal;
    });
    return nextSeq;
  } catch (err) {
    console.warn("Firestore counter transaction unavailable, calculating from existing staff records:", err.message);
    const allStaff = await getAllStaff();
    const branchStaff = allStaff.filter(s => String(s.branchCode) === String(branchCode));
    const maxSeq = branchStaff.reduce((max, s) => Math.max(max, s.employeeNumber || 0), 0);
    return maxSeq + 1;
  }
}

/**
 * Creates a new Staff record in Firestore with auto-generated KSP Staff Code & Barcode ID
 */
export async function createStaff(staffData, actorInfo = { email: 'system' }) {
  const nextSeq = await getNextEmployeeNumber(staffData.branchCode);
  const employeeNumber = nextSeq;

  const staffCode = generateStaffCode({
    nationalityCode: staffData.nationalityCode,
    departmentCode: staffData.departmentCode,
    genderCode: staffData.genderCode,
    educationCode: staffData.educationCode,
    certificateCode: staffData.certificateCode,
    branchCode: staffData.branchCode,
    employeeNumber
  });

  const internalId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const newStaffRecord = sanitizeRecord({
    id: internalId,
    staffCode,
    firstName: staffData.firstName,
    middleName: staffData.middleName || '',
    lastName: staffData.lastName,
    gender: staffData.gender || 'male',
    genderCode: staffData.genderCode || '8',
    nationality: staffData.nationality || 'rwandan',
    nationalityCode: staffData.nationalityCode || '1',
    department: staffData.department || 'trainer',
    departmentCode: staffData.departmentCode || '3',
    branch: staffData.branch || 'kigali',
    branchCode: staffData.branchCode || '1',
    educationLevel: staffData.educationLevel || 'bachelor',
    educationCode: staffData.educationCode || '00',
    certificateRange: staffData.certificateRange || '0',
    certificateCode: staffData.certificateCode || '0',
    employeeNumber,
    jobTitle: staffData.jobTitle,
    phone: staffData.phone || '',
    email: staffData.email || '',
    photoUrl: staffData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffData.firstName + ' ' + staffData.lastName)}&background=0066ff&color=fff`,
    dateJoined: staffData.dateJoined || new Date().toISOString().split('T')[0],
    employmentStatus: 'active',
    emergencyContact: staffData.emergencyContact || '',
    notes: staffData.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Write directly to Firestore
  await setDoc(doc(db, 'staff', internalId), newStaffRecord);

  // Audit Log
  await createAuditLog({
    action: 'CREATE_STAFF',
    targetId: internalId,
    details: {
      staffCode,
      name: `${staffData.firstName} ${staffData.lastName}`,
      department: staffData.department,
      branch: staffData.branch
    },
    actorEmail: actorInfo.email
  });

  return newStaffRecord;
}

/**
 * Updates staff information in Firestore
 */
export async function updateStaff(staffId, updateFields, actorInfo = { email: 'system' }) {
  const existingStaff = await getStaffById(staffId);
  if (!existingStaff) throw new Error("Staff record not found");

  let updatedStaffCode = existingStaff.staffCode;
  let codeRegenerated = false;

  const needCodeRegeneration = (
    (updateFields.nationalityCode && updateFields.nationalityCode !== existingStaff.nationalityCode) ||
    (updateFields.departmentCode && updateFields.departmentCode !== existingStaff.departmentCode) ||
    (updateFields.genderCode && updateFields.genderCode !== existingStaff.genderCode) ||
    (updateFields.educationCode && updateFields.educationCode !== existingStaff.educationCode) ||
    (updateFields.certificateCode && updateFields.certificateCode !== existingStaff.certificateCode) ||
    (updateFields.branchCode && updateFields.branchCode !== existingStaff.branchCode)
  );

  if (needCodeRegeneration) {
    codeRegenerated = true;
    const nCode = updateFields.nationalityCode || existingStaff.nationalityCode;
    const dCode = updateFields.departmentCode || existingStaff.departmentCode;
    const gCode = updateFields.genderCode || existingStaff.genderCode;
    const eCode = updateFields.educationCode || existingStaff.educationCode;
    const cCode = updateFields.certificateCode || existingStaff.certificateCode;
    const bCode = updateFields.branchCode || existingStaff.branchCode;

    let empNum = existingStaff.employeeNumber;
    if (updateFields.branchCode && updateFields.branchCode !== existingStaff.branchCode) {
      empNum = await getNextEmployeeNumber(bCode);
    }

    updatedStaffCode = generateStaffCode({
      nationalityCode: nCode,
      departmentCode: dCode,
      genderCode: gCode,
      educationCode: eCode,
      certificateCode: cCode,
      branchCode: bCode,
      employeeNumber: empNum
    });

    updateFields.employeeNumber = empNum;
  }

  const updatedRecord = sanitizeRecord({
    ...existingStaff,
    ...updateFields,
    staffCode: updatedStaffCode,
    updatedAt: new Date().toISOString()
  });

  // Direct Firestore update
  await updateDoc(doc(db, 'staff', staffId), updatedRecord);

  // Audit log
  await createAuditLog({
    action: codeRegenerated ? 'STAFF_CODE_REISSUED' : 'UPDATE_STAFF',
    targetId: staffId,
    details: {
      oldCode: existingStaff.staffCode,
      newCode: updatedStaffCode,
      codeRegenerated,
      changes: updateFields
    },
    actorEmail: actorInfo.email
  });

  return updatedRecord;
}
