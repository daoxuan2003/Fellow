import { canManageCreatedRecord } from './ownership.js'

export function canDeleteWish(wish, currentUserId) {
  return canManageCreatedRecord(wish, currentUserId)
}
