export function canManageCreatedRecord(record, currentUserId) {
  if (!record?.createdBy || !currentUserId) return false

  return String(record.createdBy) === String(currentUserId)
}
