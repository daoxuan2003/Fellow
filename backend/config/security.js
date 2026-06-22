const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function getAllowedOrigins(env = process.env) {
  const configuredOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV !== 'production') {
    configuredOrigins.push(...DEVELOPMENT_ORIGINS);
  }

  return new Set(configuredOrigins);
}

function createCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    }
  };
}

function getTrustProxy(env = process.env) {
  if (env.TRUST_PROXY_HOPS === '0' || env.TRUST_PROXY_HOPS === 'false') {
    return false;
  }

  if (env.TRUST_PROXY_HOPS) {
    const hops = Number.parseInt(env.TRUST_PROXY_HOPS, 10);
    if (!Number.isInteger(hops) || hops < 1 || hops > 10) {
      throw new Error('TRUST_PROXY_HOPS 必须是 1 到 10 的整数，或设置为 0');
    }
    return hops;
  }

  return env.NODE_ENV === 'production' ? 1 : false;
}

module.exports = {
  createCorsOptions,
  getAllowedOrigins,
  getTrustProxy
};
