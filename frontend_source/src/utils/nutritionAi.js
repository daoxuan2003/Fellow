import { CONFIG } from './config.js'
export async function nutritionAiApi(path, { method = 'GET', body } = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 65000)
  const multipart = body instanceof FormData
  try {
    const response = await fetch(`${CONFIG.API_URL}/nutrition${path}`, { method, signal: controller.signal,
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
      body: body ? multipart ? body : JSON.stringify(body) : undefined })
    const result = await response.json()
    if (!response.ok || !result.success) throw Object.assign(new Error(result.message || '暂时无法保存，请重试'), { status: response.status })
    return result
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('连接超时或中断，输入已保留。重试不会重复加入食物。')
    throw error
  } finally { clearTimeout(timer) }
}
// Re-encode locally: strip photo metadata and keep mobile uploads small.
export async function mealPhoto(file) {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('请选择不超过 20MB 的照片')
  let bitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { throw new Error('无法读取这张照片，请转换为 JPG 或 PNG 后重试') }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82))
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('照片仍然过大，请裁剪餐食区域后重试')
    return blob
  } finally { bitmap.close() }
}
export const confidenceLabels = { high: '高', medium: '中', low: '低' }
export const basisLabels = { visual: '视觉估计', user: '按你的描述', label: '包装标签', assumption: '油酱等估计' }
