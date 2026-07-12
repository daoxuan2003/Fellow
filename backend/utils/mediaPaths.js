const storageService = require('../services/storage');

const MAX_MEDIA_PHOTOS = 20;

function getRequestBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function normalizeStoragePath(storagePath) {
  if (typeof storagePath !== 'string') return null;
  const value = storagePath.trim();
  if (
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').includes('..') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  ) {
    return null;
  }
  return value;
}

function isOwnedCouplePhotoPath(userId, partnerId, coupleId, storagePath) {
  return (
    storagePath.startsWith(`couples/${coupleId}/photos/`) &&
    storageService.hasAccess(userId, partnerId, storagePath)
  );
}

function normalizeOwnedPhotoPaths(rawPhotos, { userId, partnerId, coupleId }) {
  if (rawPhotos === undefined || rawPhotos === null) {
    return { photos: [] };
  }
  if (!Array.isArray(rawPhotos)) {
    return { error: '照片格式不正确' };
  }

  const photos = [];
  for (const rawPhoto of rawPhotos.slice(0, MAX_MEDIA_PHOTOS)) {
    const storagePath = normalizeStoragePath(rawPhoto);
    if (!storagePath) {
      return { error: '照片文件路径不正确' };
    }
    if (!isOwnedCouplePhotoPath(userId, partnerId, coupleId, storagePath)) {
      return { error: '无权使用该照片文件', status: 403 };
    }
    photos.push(storagePath);
  }

  return { photos };
}

async function serializeStoredPhotoUrls(rawPhotos, req, { userId, partnerId, coupleId }) {
  if (!Array.isArray(rawPhotos)) return [];

  const serialized = [];
  for (const rawPhoto of rawPhotos) {
    if (typeof rawPhoto !== 'string') continue;
    const storagePath = normalizeStoragePath(rawPhoto);
    if (storagePath && rawPhoto.trim() === storagePath && storagePath.startsWith('couples/')) {
      if (isOwnedCouplePhotoPath(userId, partnerId, coupleId, storagePath)) {
        serialized.push(await storageService.getUrl(storagePath, 3600, getRequestBaseUrl(req)));
      }
      continue;
    }
    serialized.push(rawPhoto);
  }

  return serialized;
}

module.exports = {
  getRequestBaseUrl,
  normalizeStoragePath,
  isOwnedCouplePhotoPath,
  normalizeOwnedPhotoPaths,
  serializeStoredPhotoUrls
};
