export function canDeleteWish(wish, currentUserId) {
  if (!wish?.createdBy || !currentUserId) return false

  return String(wish.createdBy) === String(currentUserId)
}
