import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

const AUDIT_LOCAL_STORAGE_KEY = 'eshema_audit_logs';

function getLocalAuditLogs() {
  const data = localStorage.getItem(AUDIT_LOCAL_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveLocalAuditLog(log) {
  const logs = getLocalAuditLogs();
  logs.unshift(log);
  localStorage.setItem(AUDIT_LOCAL_STORAGE_KEY, JSON.stringify(logs.slice(0, 500))); // Keep last 500
}

/**
 * Creates an audit log record
 */
export async function createAuditLog({ action, targetId, details, actorEmail = 'operator' }) {
  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    targetId,
    details: details || {},
    actorEmail
  };

  try {
    await Promise.race([
      addDoc(collection(db, 'auditLogs'), auditEntry),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
  } catch (err) {
    console.warn("Firestore audit log write error, storing locally:", err.message);
  }

  saveLocalAuditLog(auditEntry);
  return auditEntry;
}

/**
 * Retrieves audit logs
 */
export async function getAuditLogs(maxCount = 100) {
  let firestoreLogs = [];
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
    ]);
    if (!snapshot.empty) {
      firestoreLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.warn("Firestore audit log fetch error, using local fallback:", err.message);
  }

  const localLogs = getLocalAuditLogs();
  const map = new Map();
  firestoreLogs.forEach(l => map.set(l.id, l));
  localLogs.forEach(l => {
    if (!map.has(l.id)) map.set(l.id, l);
  });

  return Array.from(map.values()).slice(0, maxCount);
}
