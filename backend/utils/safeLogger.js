const SENSITIVE_URL_PATTERN = /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqps?):\/\/[^\s'")]+/gi;
const CREDENTIAL_URL_PATTERN = /\bhttps?:\/\/[^\s'")]*:[^\s'")]*@[^\s'")]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const SENSITIVE_FIELD_PATTERN = /\b(password|passwd|pwd|token|secret|authorization|auth|api[_-]?key|pairCode|inviteCode)\b\s*[:=]\s*(['"]?)[^,'"\s}]+(['"]?)/gi;
const SENSITIVE_KEY_PATTERN = /^(password|passwd|pwd|token|secret|authorization|auth|api[_-]?key|pairCode|inviteCode|endpoint|p256dh)$/i;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function redactText(value) {
  return String(value)
    .replace(SENSITIVE_URL_PATTERN, '[redacted-url]')
    .replace(CREDENTIAL_URL_PATTERN, '[redacted-url]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(JWT_PATTERN, '[redacted-token]')
    .replace(SENSITIVE_FIELD_PATTERN, '$1=[redacted]');
}

function sanitizeError(error) {
  if (error instanceof Error) {
    const safe = {
      name: redactText(error.name || 'Error'),
      message: redactText(error.message || '')
    };

    if (error.code !== undefined) {
      safe.code = redactText(error.code);
    }

    if (process.env.NODE_ENV !== 'production' && error.stack) {
      safe.stack = redactText(error.stack).split('\n').slice(0, 6).join('\n');
    }

    return safe;
  }

  return {
    message: redactText(error === undefined ? 'Unknown error' : error)
  };
}

function sanitizeLogValue(value, seen = new WeakSet()) {
  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (typeof value === 'string') {
    return redactText(value);
  }

  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const safeItems = value.map((item) => sanitizeLogValue(item, seen));
    seen.delete(value);
    return safeItems;
  }

  const safe = {};
  Object.entries(value).forEach(([key, item]) => {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '[redacted]'
      : sanitizeLogValue(item, seen);
  });

  seen.delete(value);
  return safe;
}

function logInfo(...args) {
  console.log(...args.map((arg) => sanitizeLogValue(arg)));
}

function logDebug(...args) {
  if (!isProduction()) {
    logInfo(...args);
  }
}

function logError(message, error) {
  console.error(redactText(message), sanitizeError(error));
}

module.exports = {
  logDebug,
  logError,
  logInfo,
  redactText,
  sanitizeError,
  sanitizeLogValue
};
