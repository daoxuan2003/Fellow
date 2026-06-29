const SENSITIVE_URL_PATTERN = /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqps?):\/\/[^\s'")]+/gi;
const CREDENTIAL_URL_PATTERN = /\bhttps?:\/\/[^\s'")]*:[^\s'")]*@[^\s'")]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const SENSITIVE_FIELD_PATTERN = /\b(password|passwd|pwd|token|secret|authorization|auth|api[_-]?key|pairCode|inviteCode)\b\s*[:=]\s*(['"]?)[^,'"\s}]+(['"]?)/gi;

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

function logError(message, error) {
  console.error(message, sanitizeError(error));
}

module.exports = {
  logError,
  redactText,
  sanitizeError
};
