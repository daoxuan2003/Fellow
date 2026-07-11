const MAX_ARRAY_ITEMS = 12
const MAX_OBJECT_KEYS = 16

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function redactString(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:token|access_token|refresh_token|key|secret)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b(endpoint|token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s'"<>]+/gi, (match) => {
      try {
        const url = new URL(match)
        return `${url.origin}/[redacted]`
      } catch {
        return '[redacted-url]'
      }
    })
}

function isSensitiveKey(key) {
  return /token|secret|password|authorization|endpoint|subscription|paircode|pairCode/i.test(key)
}

export function sanitizeLogValue(value, seen = new WeakSet()) {
  if (value == null) return value

  const valueType = typeof value
  if (valueType === 'string') return redactString(value)
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return value.toString()
  if (valueType === 'function') return `[Function ${value.name || 'anonymous'}]`

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message)
    }
  }

  if (value instanceof URL) return redactString(value.href)

  if (typeof Event !== 'undefined' && value instanceof Event) {
    return { type: value.type }
  }

  if (typeof PushSubscription !== 'undefined' && value instanceof PushSubscription) {
    return {
      endpoint: '[push-endpoint]',
      expirationTime: value.expirationTime || null
    }
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeLogValue(item, seen))
      if (value.length > MAX_ARRAY_ITEMS) items.push(`[${value.length - MAX_ARRAY_ITEMS} more]`)
      return items
    }

    if (!isPlainObject(value)) {
      return `[${value.constructor?.name || 'Object'}]`
    }

    const result = {}
    const entries = Object.entries(value)
    entries.slice(0, MAX_OBJECT_KEYS).forEach(([key, item]) => {
      result[key] = isSensitiveKey(key) ? '[redacted]' : sanitizeLogValue(item, seen)
    })
    if (entries.length > MAX_OBJECT_KEYS) {
      result.__truncated = entries.length - MAX_OBJECT_KEYS
    }
    return result
  }

  return redactString(String(value))
}

export function isClientDebugEnabled() {
  if (import.meta.env?.DEV) return true
  try {
    return globalThis.localStorage?.getItem('fellow_debug_logs') === '1'
  } catch {
    return false
  }
}

export function createClientLogger(scope) {
  const prefix = `[${scope}]`
  const emit = (method, args) => {
    if (!isClientDebugEnabled()) return
    const writer = console[method] || console.debug || console.log
    writer.call(console, prefix, ...args.map(value => sanitizeLogValue(value)))
  }

  return {
    debug: (...args) => emit('debug', args),
    info: (...args) => emit('info', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args)
  }
}
