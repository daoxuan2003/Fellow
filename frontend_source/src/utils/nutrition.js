export const meals = [{ key: 'breakfast', label: '早餐' }, { key: 'lunch', label: '午餐' }, { key: 'dinner', label: '晚餐' }, { key: 'snack', label: '加餐' }]
export const categories = { all: '全部', protein: '蛋白质', staple: '主食', vegetable: '蔬菜', fruit: '水果', fat: '油脂坚果', other: '其他' }
export const weightTypes = { raw: '生重 / 干重', cooked: '熟重', ready: '成品净重' }
export const goals = { fat_loss: '减脂', recomp: '增肌减脂', maintain: '维持', gain: '增肌增重' }
export const fmt = value => value == null ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 1 })
export function profileForm(profile, seed = {}) {
  const source = profile || seed
  const female = source.sex !== 'male'
  return { sex: source.sex || 'female', age: source.age ?? '', height: source.height ?? (female ? 160 : 182), baselineWeight: source.baselineWeight ?? 80, waist: source.waist ?? '', thigh: source.thigh ?? '', hip: source.hip ?? '', bodyFat: source.bodyFat ?? '', goal: source.goal || (female ? 'fat_loss' : 'recomp'), protein: source.protein ?? (female ? 115 : 140), fiber: source.fiber ?? 25, needsClinicalAdvice: Boolean(source.needsClinicalAdvice), allowSharedMeals: Boolean(source.allowSharedMeals), allowPartnerAiMeals: Boolean(source.allowPartnerAiMeals), privacy: { completion: true, calories: true, foods: false, weight: false, waist: false, thigh: false, ...source.privacy }, revision: source.revision ?? 0 }
}
export function previewTotal(items, partner = false) {
  return items.reduce((sum, item) => sum + Number(partner ? item.partnerAmount : item.amount) * item.food.per100.calories / 100, 0)
}
export function walkRemaining(start, now = Date.now()) { return Math.max(0, Math.ceil((new Date(start).getTime() + 600000 - now) / 1000)) }
export function trendPoints(rows, key, width = 300, height = 100) {
  const values = rows.map(row => row[key]).filter(value => value != null)
  if (!values.length) return { segments: [], min: null, max: null }
  const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, key.includes('Weight') || key === 'weight' ? 1 : 20)
  const segments = []; let current = []
  rows.forEach((row, i) => {
    if (row[key] == null) { if (current.length) segments.push(current); current = []; return }
    current.push({ x: 8 + i * (width - 16) / Math.max(rows.length - 1, 1), y: 8 + (height - 16) * (1 - (row[key] - min) / spread), date: row.date, value: row[key] })
  })
  if (current.length) segments.push(current)
  return { segments, min, max }
}
