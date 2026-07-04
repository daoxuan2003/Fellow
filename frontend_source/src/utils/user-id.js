export function resolveCurrentUserId(userStore = {}, storage = globalThis.localStorage) {
  const candidates = [
    userStore.currentUserId,
    userStore.userId,
    userStore.currentUser?.id,
    userStore.user?.id
  ];

  for (const value of candidates) {
    if (value) return String(value);
  }

  try {
    return storage?.getItem('currentUserId') || storage?.getItem('userId') || '';
  } catch {
    return '';
  }
}

export function persistCurrentUserId(userId, storage = globalThis.localStorage) {
  const normalized = userId === undefined || userId === null ? '' : String(userId);
  if (!normalized) return '';

  try {
    storage?.setItem('currentUserId', normalized);
    // Legacy key kept in sync for old views and existing sessions.
    storage?.setItem('userId', normalized);
  } catch {
    // Storage may be unavailable in private mode; callers still receive the id.
  }

  return normalized;
}

export function clearStoredUserId(storage = globalThis.localStorage) {
  try {
    storage?.removeItem('currentUserId');
    storage?.removeItem('userId');
  } catch {
    // Ignore storage failures; logout should continue.
  }
}
