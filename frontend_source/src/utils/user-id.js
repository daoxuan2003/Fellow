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
