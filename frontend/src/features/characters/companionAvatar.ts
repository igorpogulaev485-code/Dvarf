/** Client-side naparnik portrait → compact data URL stored on the sheet. */

const ACCEPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_INPUT_BYTES = 2 * 1024 * 1024
/** Smaller than cabinet 256 — sheet JSON, not a separate upload store. */
const AVATAR_SIZE = 128
const JPEG_QUALITY = 0.82

export const COMPANION_AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'

export async function fileToCompanionAvatarDataUrl(file: File): Promise<string> {
  if (!ACCEPT_TYPES.has(file.type)) {
    throw new Error('Нужен файл JPEG, PNG или WebP')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Файл слишком большой (максимум 2 МБ)')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, AVATAR_SIZE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Не удалось обработать изображение')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}
