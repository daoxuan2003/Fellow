const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');

const {
  avatarUpload,
  photoUpload,
  validateUploadedImage,
  AVATAR_IMAGE_TYPES,
  ALLOWED_IMAGE_TYPES,
  AVATAR_IMAGE_ERROR_MESSAGE,
  PHOTO_IMAGE_ERROR_MESSAGE
} = require('../middleware/upload');
const { errorHandler } = require('../middleware/errorHandler');

const PNG_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==',
  'base64'
);

let server;
let baseUrl;

test.before(async () => {
  const app = express();
  app.post(
    '/photo',
    photoUpload.single('file'),
    validateUploadedImage(ALLOWED_IMAGE_TYPES, PHOTO_IMAGE_ERROR_MESSAGE),
    (req, res) => res.json({
      success: true,
      data: {
        originalname: req.file.originalname,
        safeFilename: req.file.safeFilename,
        detectedMime: req.file.detectedMime
      }
    })
  );
  app.post(
    '/avatar',
    avatarUpload.single('avatar'),
    validateUploadedImage(AVATAR_IMAGE_TYPES, AVATAR_IMAGE_ERROR_MESSAGE),
    (req, res) => res.json({ success: true })
  );
  app.use(errorHandler);

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

function formWithFile(field, buffer, filename, type) {
  const form = new FormData();
  form.append(field, new Blob([buffer], { type }), filename);
  return form;
}

test('verified image content replaces an untrusted original extension', async () => {
  const response = await fetch(`${baseUrl}/photo`, {
    method: 'POST',
    body: formWithFile('file', PNG_IMAGE, 'payload.html', 'image/png')
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.originalname, 'payload.html');
  assert.equal(body.data.safeFilename, 'upload.png');
  assert.equal(body.data.detectedMime, 'image/png');
});

test('spoofed image MIME is rejected from file content', async () => {
  const response = await fetch(`${baseUrl}/photo`, {
    method: 'POST',
    body: formWithFile('file', Buffer.from('<script>alert(1)</script>'), 'photo.png', 'image/png')
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, PHOTO_IMAGE_ERROR_MESSAGE);
});

test('detected image content overrides an incorrect declared MIME', async () => {
  const response = await fetch(`${baseUrl}/photo`, {
    method: 'POST',
    body: formWithFile('file', PNG_IMAGE, 'photo.jpg', 'image/jpeg')
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.safeFilename, 'upload.png');
  assert.equal(body.data.detectedMime, 'image/png');
});

test('avatar upload enforces the 5MB limit before route handling', async () => {
  const oversizedImage = Buffer.alloc(5 * 1024 * 1024 + 1);
  PNG_IMAGE.copy(oversizedImage);

  const response = await fetch(`${baseUrl}/avatar`, {
    method: 'POST',
    body: formWithFile('avatar', oversizedImage, 'avatar.png', 'image/png')
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '文件大小超过限制');
});
