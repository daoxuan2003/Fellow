export const WHEEL_CATEGORIES = [
  { id: 'special', label: '吃点好的', hint: '值得专程去吃的一顿', placeholder: '比如：一直想去的那家烤肉' },
  { id: 'everyday', label: '随便吃点', hint: '日常这一餐，轻松决定', placeholder: '比如：楼下的面馆' },
  { id: 'outing', label: '出去玩时想做的事', hint: '把想一起做的事放进来', placeholder: '比如：去江边散步' }
]
export function wheelRotation(current, index, count) {
  if (!Number.isInteger(count) || count < 1 || index < 0 || index >= count) throw new Error('Invalid wheel result');
  const target = (360 - index * 360 / count) % 360
  return current + 360 * 5 + (target - current % 360 + 360) % 360
}
export function wheelSlice(index, count) {
  const step = 360 / count
  const point = degrees => {
    const radians = (degrees - 90) * Math.PI / 180
    return `${150 + 144 * Math.cos(radians)} ${150 + 144 * Math.sin(radians)}`
  }
  return `M 150 150 L ${point(index * step - step / 2)} A 144 144 0 ${step > 180 ? 1 : 0} 1 ${point(index * step + step / 2)} Z`
}
export function wheelLabel(label, count, index) {
  if (count > 12) return String(index + 1)
  const chars = Array.from(label)
  const max = count > 6 ? 4 : 6
  return chars.length > max ? chars.slice(0, max).join('') + '…' : label
}
