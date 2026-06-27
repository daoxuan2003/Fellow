const padDatePart = (value) => String(value).padStart(2, '0')

export function formatLocalDate(value = new Date()) {
  if (value === null || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())

  return `${year}-${month}-${day}`
}

export function todayLocalDate() {
  return formatLocalDate(new Date())
}
