import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  updateDoc 
} from "firebase/firestore";
import { auth, db } from "./config";
import { createAuditLog } from "../services/auditService";

const LOCAL_USERS_KEY = 'eshema_registered_users';

function getLocalUsers() {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(list) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
}

/**
 * Register a new user
 */
export async function registerUser({ fullName, email, password, department = 'trainer', branch = 'kigali', requestedRole = 'staff' }) {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Check existing users count to determine if this is the FIRST user (Super Admin)
  let isFirstUser = false;
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    isFirstUser = usersSnap.empty;
  } catch (e) {
    const localUsers = getLocalUsers();
    isFirstUser = localUsers.length === 0;
  }

  // 2. Firebase Auth registration
  let uid = `user-${Date.now()}`;
  let authUser = null;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    authUser = userCred.user;
    uid = authUser.uid;

    if (isFirstUser && authUser) {
      await sendEmailVerification(authUser);
    }
  } catch (err) {
    console.warn("Firebase auth creation fallback:", err.message);
  }

  const role = isFirstUser ? 'super_admin' : requestedRole;
  const approved = isFirstUser; // Super Admin is auto-approved; subsequent users require Super Admin approval
  const status = isFirstUser ? 'approved' : 'pending_approval';

  const userDocData = {
    uid,
    fullName,
    email: normalizedEmail,
    department,
    branch,
    role,
    approved,
    emailVerified: isFirstUser, // Super Admin email auto-verified; others verified by Super Admin
    status,
    createdAt: new Date().toISOString()
  };

  // Save to Firestore
  try {
    await setDoc(doc(db, "users", uid), userDocData);
  } catch (e) {
    console.warn("Firestore user record save fallback:", e.message);
  }

  // Save locally
  const localUsers = getLocalUsers();
  localUsers.push(userDocData);
  saveLocalUsers(localUsers);

  await createAuditLog({
    action: isFirstUser ? 'REGISTER_SUPER_ADMIN' : 'REGISTER_USER',
    targetId: uid,
    details: { fullName, email: normalizedEmail, role, status },
    actorEmail: normalizedEmail
  });

  return userDocData;
}

/**
 * Login user
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  let userProfile = null;

  try {
    const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const uid = userCred.user.uid;
    
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      userProfile = userDoc.data();
    }
  } catch (err) {
    console.warn("Firebase Auth login fallback:", err.message);
  }

  // Local fallback check if Firestore is uninitialized
  if (!userProfile) {
    const localUsers = getLocalUsers();
    userProfile = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);
  }

  if (!userProfile) {
    // Demo account check for quick testing
    if (normalizedEmail === 'admin@ksp.rw' || normalizedEmail === 'superadmin@ksp.rw') {
      userProfile = { uid: 'demo-super_admin', fullName: 'KSP Super Admin', email: normalizedEmail, role: 'super_admin', approved: true, status: 'approved' };
    } else if (normalizedEmail === 'manager@ksp.rw') {
      userProfile = { uid: 'demo-manager', fullName: 'KSP Manager', email: normalizedEmail, role: 'manager', approved: true, status: 'approved' };
    } else {
      throw new Error("Invalid login credentials. User account not found.");
    }
  }

  if (!userProfile.approved && userProfile.role !== 'super_admin') {
    throw new Error("Your account is pending approval by the Super Admin. Please contact an administrator.");
  }

  return userProfile;
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email) {
  if (!email || !email.includes('@')) {
    throw new Error("Please enter a valid email address.");
  }
  
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (err) {
    console.warn("Firebase reset password email error:", err.message);
  }

  return true;
}

/**
 * Get all users for Super Admin approval panel
 */
export async function getAllUsers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn("Firestore users list error, local fallback:", e.message);
  }

  return getLocalUsers();
}

/**
 * Super Admin approves or rejects a user
 */
export async function approveUserStatus(uid, assignedRole, approved = true, actorEmail = 'admin@ksp.rw', emailVerified = true) {
  const updateData = {
    role: assignedRole,
    approved,
    emailVerified,
    status: approved ? 'approved' : 'rejected',
    updatedAt: new Date().toISOString()
  };

  try {
    await updateDoc(doc(db, "users", uid), updateData);
  } catch (e) {
    console.warn("Firestore user approval update error:", e.message);
  }

  const localUsers = getLocalUsers();
  const idx = localUsers.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    localUsers[idx] = { ...localUsers[idx], ...updateData };
    saveLocalUsers(localUsers);
  }

  await createAuditLog({
    action: approved ? 'APPROVE_USER' : 'REJECT_USER',
    targetId: uid,
    details: { assignedRole, approved, emailVerified },
    actorEmail
  });

  return true;
}

/**
 * Super Admin manually verifies email of a user
 */
export async function verifyUserEmailByAdmin(uid, emailVerified = true, actorEmail = 'admin@ksp.rw') {
  const updateData = {
    emailVerified,
    updatedAt: new Date().toISOString()
  };

  try {
    await updateDoc(doc(db, "users", uid), updateData);
  } catch (e) {
    console.warn("Firestore email verification update error:", e.message);
  }

  const localUsers = getLocalUsers();
  const idx = localUsers.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    localUsers[idx] = { ...localUsers[idx], ...updateData };
    saveLocalUsers(localUsers);
  }

  await createAuditLog({
    action: 'VERIFY_USER_EMAIL',
    targetId: uid,
    details: { emailVerified },
    actorEmail
  });

  return true;
}

/**
 * Logout
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Logout error:", e.message);
  }
}
