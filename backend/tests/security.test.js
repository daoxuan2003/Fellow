const test = require('node:test');
const assert = require('node:assert/strict');

const { DEVELOPMENT_JWT_SECRET, resolveJwtSecret } = require('../config/auth');
const { createCorsOptions, getAllowedOrigins, getTrustProxy } = require('../config/security');
const { generatePairCode, canViewLimitedProfile } = require('../utils/authSecurity');
const { parseRegistration, parseLogin, parsePairCode } = require('../middleware/validation');

test('production requires a strong JWT secret', () => {
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production' }),
    /JWT_SECRET/
  );
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: DEVELOPMENT_JWT_SECRET }),
    /JWT_SECRET/
  );
  assert.equal(
    resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(32) }),
    'a'.repeat(32)
  );
});

test('development keeps a local-only JWT fallback', () => {
  assert.equal(resolveJwtSecret({ NODE_ENV: 'development' }), DEVELOPMENT_JWT_SECRET);
});

test('CORS only allows configured production origins', () => {
  const env = { NODE_ENV: 'production', CORS_ORIGINS: 'https://one.example, https://two.example' };
  const allowed = getAllowedOrigins(env);
  const options = createCorsOptions(env);

  assert.equal(allowed.has('https://one.example'), true);
  options.origin('https://one.example', (_error, result) => assert.equal(result, true));
  options.origin('https://evil.example', (_error, result) => assert.equal(result, false));
  options.origin(undefined, (_error, result) => assert.equal(result, true));
});

test('proxy configuration is strict and production-aware', () => {
  assert.equal(getTrustProxy({ NODE_ENV: 'development' }), false);
  assert.equal(getTrustProxy({ NODE_ENV: 'production' }), 1);
  assert.equal(getTrustProxy({ TRUST_PROXY_HOPS: '2' }), 2);
  assert.throws(() => getTrustProxy({ TRUST_PROXY_HOPS: '99' }), /TRUST_PROXY_HOPS/);
});

test('registration and login input are normalized without weakening passwords', () => {
  assert.deepEqual(
    parseRegistration({ nickname: ' 小赴 ', account: ' fellow ', password: 'password8' }),
    { value: { nickname: '小赴', account: 'fellow', password: 'password8' } }
  );
  assert.match(parseRegistration({ nickname: '', account: 'ab', password: '123' }).error, /昵称/);
  assert.deepEqual(
    parseLogin({ account: ' old-account ', password: '1' }),
    { value: { account: 'old-account', password: '1' } }
  );
});

test('pair codes are cryptographically generated and normalized', () => {
  for (let index = 0; index < 20; index += 1) {
    assert.match(generatePairCode(), /^[A-Z0-9]{6}$/);
  }
  assert.deepEqual(parsePairCode({ pairCode: ' ab12cd ' }), { value: { pairCode: 'AB12CD' } });
  assert.match(parsePairCode({ pairCode: 'ABC' }).error, /6 位/);
});

test('limited profiles are only visible inside the active relationship flow', () => {
  const viewer = {
    _id: '111111111111111111111111',
    partnerId: '222222222222222222222222',
    invitingTo: '333333333333333333333333',
    inviteStatus: 'inviting'
  };

  assert.equal(canViewLimitedProfile(viewer, viewer._id), true);
  assert.equal(canViewLimitedProfile(viewer, viewer.partnerId), true);
  assert.equal(canViewLimitedProfile(viewer, viewer.invitingTo), true);
  assert.equal(canViewLimitedProfile(viewer, '444444444444444444444444'), false);

  viewer.inviteStatus = 'idle';
  assert.equal(canViewLimitedProfile(viewer, viewer.invitingTo), false);
});
