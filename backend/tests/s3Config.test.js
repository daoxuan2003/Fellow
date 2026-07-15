const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveS3Region } = require('../utils/s3Config');

test('Rainyun ROS always uses its required signing region', () => {
  assert.equal(
    resolveS3Region('https://cn-sy1.rains3.com', 'cn-north-1'),
    'rainyun'
  );
});

test('other S3-compatible providers preserve their configured region', () => {
  assert.equal(
    resolveS3Region('https://s3.ap-southeast-1.amazonaws.com', 'ap-southeast-1'),
    'ap-southeast-1'
  );
});

test('other S3-compatible providers receive a stable default region', () => {
  assert.equal(resolveS3Region('https://storage.example.com', ''), 'us-east-1');
});
