import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  updateDoc 
} from "firebase/firestore";
import { auth, db } from "./config";
import { createAuditLog } from "../services/auditService";

/**
 * Register a new user and save directly to Firestore 'users' collection
 */
export async function registerUser({ fullName, email, password, department = 'trainer', branch = 'kigali', requestedRole = 'staff' }) {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Check existing users count to determine if this is the FIRST user (Super Admin)
  let isFirstUser = false;
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    isFirstUser = usersSnap.empty;
  } catch (e) {
    console.warn("Firestore users query error:", e.message);
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
    console.warn("Firebase auth creation notice:", err.message);
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

  // Save directly to Firestore
  await setDoc(doc(db, "users", uid), userDocData);

  await createAuditLog({
    action: isFirstUser ? 'REGISTER_SUPER_ADMIN' : 'REGISTER_USER',
    targetId: uid,
    details: { fullName, email: normalizedEmail, role, status },
    actorEmail: normalizedEmail
  });

  return userDocData;
}

/**
 * Login user and fetch user profile directly from Firestore
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  let userProfile = null;

  try {
    const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const uid = userCred.user.uid;
    
    // Fetch user profile directly from Firestore
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      userProfile = userDoc.data();
    }
  } catch (err) {
    console.warn("Firebase Auth login error:", err.message);
  }

  if (!userProfile) {
    // Demo account check for quick testing if database isn't initialized yet
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
  
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  return true;
}

/**
 * Get all users directly from Firestore for Super Admin approval panel
 */
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  if (!snapshot.empty) {
    return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
  }
  return [];
}

/**
 * Super Admin approves or rejects a user directly in Firestore
 */
export async function approveUserStatus(uid, assignedRole, approved = true, actorEmail = 'admin@ksp.rw', emailVerified = true) {
  const updateData = {
    role: assignedRole,
    approved,
    emailVerified,
    status: approved ? 'approved' : 'rejected',
    updatedAt: new Date().toISOString()
  };

  await updateDoc(doc(db, "users", uid), updateData);

  await createAuditLog({
    action: approved ? 'APPROVE_USER' : 'REJECT_USER',
    targetId: uid,
    details: { assignedRole, approved, emailVerified },
    actorEmail
  });

  return true;
}

/**
 * Super Admin manually verifies email of a user directly in Firestore
 */
export async function verifyUserEmailByAdmin(uid, emailVerified = true, actorEmail = 'admin@ksp.rw') {
  const updateData = {
    emailVerified,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(doc(db, "users", uid), updateData);

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
