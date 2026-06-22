const DEVELOPMENT_JWT_SECRET = 'dev-secret-key-for-local-development-only';
const UNSAFE_PRODUCTION_SECRETS = new Set([
  DEVELOPMENT_JWT_SECRET,
  'change-me-to-a-random-string-at-least-32-chars',
  'your_jwt_secret'
]);

function resolveJwtSecret(env = process.env) {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';

  if (env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32 || UNSAFE_PRODUCTION_SECRETS.has(secret)) {
      throw new Error('生产环境必须配置至少 32 位的安全 JWT_SECRET');
    }
  }

  return secret || DEVELOPMENT_JWT_SECRET;
}

module.exports = {
  DEVELOPMENT_JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  JWT_SECRET: resolveJwtSecret(),
  resolveJwtSecret
};
