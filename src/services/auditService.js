import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Creates an audit log record directly in Firestore
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
    await addDoc(collection(db, 'auditLogs'), auditEntry);
  } catch (err) {
    console.warn("Firestore audit log write error:", err.message);
  }

  return auditEntry;
}

/**
 * Retrieves audit logs directly from Firestore
 */
export async function getAuditLogs(maxCount = 100) {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.warn("Firestore audit log fetch error:", err.message);
  }

  return [];
}
