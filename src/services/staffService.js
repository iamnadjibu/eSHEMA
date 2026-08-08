import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateStaffCode } from '../utils/staffCodeGenerator';

import { createAuditLog } from './auditService';

const LOCAL_STORAGE_KEY = 'eshema_staff_db';

/**
 * Helper to get local staff state fallback
 */
function getLocalStaffList() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Helper to save local staff state
 */
function saveLocalStaffList(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

function sanitizeRecord(obj) {
  const clean = {};
  Object.keys(obj).forEach(key => {
    clean[key] = obj[key] === undefined ? '' : obj[key];
  });
  return clean;
}

/**
 * Gets all staff members
 */
export async function getAllStaff() {
  let firestoreStaff = [];
  try {
    const staffCol = collection(db, 'staff');
    const snapshot = await Promise.race([
      getDocs(staffCol),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
    ]);
    firestoreStaff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn("Firestore offline or permission pending, using local storage fallback:", err.message);
  }

  const localStaff = getLocalStaffList();
  
  // Merge Firestore staff and Local staff so offline or locally added records are seamlessly displayed
  const map = new Map();
  firestoreStaff.forEach(s => map.set(s.id || s.staffCode, s));
  localStaff.forEach(s => {
    if (!map.has(s.id || s.staffCode)) {
      map.set(s.id || s.staffCode, s);
    }
  });

  return Array.from(map.values());
}

/**
 * Finds staff by Staff Code (e.g. KSP-137-052-1025)
 */
export async function getStaffByCode(staffCode) {
  if (!staffCode) return null;
  const normalizedCode = staffCode.trim().toUpperCase();

  try {
    // 1. Try querying staffCode in Firestore
    const q = query(collection(db, 'staff'), where('staffCode', '==', normalizedCode));
    const snapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
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
    console.warn("Firestore lookup error, using local fallback:", err.message);
  }

  const localList = getLocalStaffList();
  return localList.find(s => s.staffCode.toUpperCase() === normalizedCode || s.id === staffCode.trim()) || null;
}

/**
 * Finds staff by internal ID
 */
export async function getStaffById(staffId) {
  if (!staffId) return null;
  try {
    const docRef = doc(db, 'staff', staffId);
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.warn("Firestore getById error, fallback to local:", err.message);
  }

  const localList = getLocalStaffList();
  return localList.find(s => s.id === staffId) || null;
}

/**
 * Gets the next sequential employee number for a given branch ('1'=Kigali, '2'=Kayonza, '3'=Elsewhere)
 */
export async function getNextEmployeeNumber(branchCode) {
  const branchKeyMap = { '1': 'kigali', '2': 'kayonza', '3': 'elsewhere' };
  const branchKey = branchKeyMap[branchCode] || 'kigali';

  try {
    const counterRef = doc(db, 'counters', 'branch_counters');
    const nextSeq = await Promise.race([
      runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentVal = 0;
        if (counterDoc.exists()) {
          currentVal = counterDoc.data()[branchKey] || 0;
        }
        const newVal = currentVal + 1;
        transaction.set(counterRef, { [branchKey]: newVal }, { merge: true });
        return newVal;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
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
 * Creates a new Staff record with auto-generated KSP Staff Code & Barcode ID
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
    gender: staffData.gender || 'male', // 'female' | 'male'
    genderCode: staffData.genderCode || '8', // '7' | '8'
    nationality: staffData.nationality || 'rwandan', // 'rwandan' | 'foreigner'
    nationalityCode: staffData.nationalityCode || '1', // '1' | '2'
    department: staffData.department || 'trainer', // 'executive' | 'management' | 'trainer' | 'other'
    departmentCode: staffData.departmentCode || '3', // '1' | '2' | '3' | '4'
    branch: staffData.branch || 'kigali', // 'kigali' | 'kayonza' | 'elsewhere'
    branchCode: staffData.branchCode || '1', // '1' | '2' | '3'
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

  // 1. Try writing to Firestore with 1.5s timeout race
  try {
    await Promise.race([
      setDoc(doc(db, 'staff', internalId), newStaffRecord),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 1500))
    ]);
  } catch (err) {
    console.warn("Firestore write error or timeout, saved locally:", err.message);
  }

  // 2. Save locally for guaranteed immediate sync
  const localList = getLocalStaffList();
  localList.unshift(newStaffRecord);
  saveLocalStaffList(localList);

  // 3. Audit Log
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
 * Updates staff information and optionally regenerates Staff Code if classification changes
 */
export async function updateStaff(staffId, updateFields, actorInfo = { email: 'system' }) {
  const existingStaff = await getStaffById(staffId);
  if (!existingStaff) throw new Error("Staff record not found");

  let updatedStaffCode = existingStaff.staffCode;
  let codeRegenerated = false;

  // Check if classification fields affecting staffCode have changed
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

    // If branch changed, generate new sequence number for new branch
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

  const updatedRecord = {
    ...existingStaff,
    ...updateFields,
    staffCode: updatedStaffCode,
    updatedAt: new Date().toISOString()
  };

  // Firestore update
  try {
    await updateDoc(doc(db, 'staff', staffId), updatedRecord);
  } catch (err) {
    console.warn("Firestore update error, updating local storage:", err.message);
  }

  // Local storage update
  const localList = getLocalStaffList();
  const index = localList.findIndex(s => s.id === staffId);
  if (index !== -1) {
    localList[index] = updatedRecord;
    saveLocalStaffList(localList);
  }

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
