const LABELED_CODE_PATTERNS = [
  /(?:取件码|提货码|领取码|取货码|凭证码|开箱码)\s*(?:是|为|[:：])?\s*([A-Z0-9]{3,}(?:[-－][A-Z0-9]{1,})*)/i,
  /凭\s*([A-Z0-9]{3,}(?:[-－][A-Z0-9]{1,})*)\s*(?:到|至|前往)?.{0,16}?(?:取件|领取|取货)/i
]

const STRUCTURED_CODE_PATTERN = /(?:^|[^\d])((?:\d{1,3}[-－]){1,3}\d{1,5})(?!\d)/

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function extractPickupCode(value) {
  const text = normalizeText(value)
  if (!text) return ''

  for (const pattern of LABELED_CODE_PATTERNS) {
    const matched = text.match(pattern)
    if (matched?.[1]) return matched[1].replace(/－/g, '-').toUpperCase()
  }

  const structured = text.match(STRUCTURED_CODE_PATTERN)
  return structured?.[1] ? structured[1].replace(/－/g, '-') : ''
}

export function matchPickupLocation(value, locations = []) {
  const text = normalizeText(value).toLowerCase()
  if (!text) return ''

  return locations
    .map(location => String(location?.name || location || '').trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .find(name => text.includes(name.toLowerCase())) || ''
}

export function recognizePickupDetails(value, locations = []) {
  return {
    code: extractPickupCode(value),
    location: matchPickupLocation(value, locations)
  }
}
