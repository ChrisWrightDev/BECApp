// Ops Chat photo attachments stored on public.messages.attachments.
// Shape of each element:
// {
//   "type": "image",
//   "bucket": "chat-photos",
//   "path": "<thread>/<yyyy>/<mm>/<uuid>.jpg",
//   "mime": "image/jpeg",
//   "width": <int>,
//   "height": <int>,
//   "size": <bytes>
// }

export const CHAT_PHOTOS_BUCKET = 'chat-photos'
export const MAX_CHAT_PHOTOS = 4
export const CHAT_PHOTO_MAX_EDGE = 1600
export const CHAT_PHOTO_JPEG_QUALITY = 0.8
export const PHOTO_PREVIEW_TEXT = '📷 Photo'
export const CHAT_PHOTO_READ_ERROR = 'Couldn\'t open that photo. If it\'s a HEIC picture, try choosing it again from your library or pick a JPEG.'

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i

export function isProbablyImageFile(file) {
  if (!file) return false
  const type = String(file.type || '').toLowerCase()
  if (type === 'image/svg+xml') return false
  if (type.startsWith('image/')) return true
  const name = String(file.name || '')
  if (/\.svg$/i.test(name)) return false
  return IMAGE_EXTENSION.test(name)
}

export function imageAttachments(message) {
  const list = message?.attachments
  if (!Array.isArray(list)) return []
  return list.filter((item) => item && item.type === 'image' && (item.path || item.previewUrl))
}

export function messageHasImage(message) {
  return imageAttachments(message).length > 0
}

/**
 * One-line preview for reminders and any last-message text.
 * Photo-only messages use "📷 Photo". A caption wins when present.
 */
export function messagePreviewText(message) {
  const body = String(message?.body || '').trim()
  if (body) return body
  if (messageHasImage(message)) return PHOTO_PREVIEW_TEXT
  return ''
}

/** Short label used inside reply quotes. */
export function replyPreviewLabel(message) {
  const body = String(message?.body || '').trim()
  if (body) return body
  if (messageHasImage(message)) return 'Photo'
  return 'Message'
}

export function attachmentAspectStyle(attachment) {
  const width = Math.max(1, Math.round(Number(attachment?.width) || 4))
  const height = Math.max(1, Math.round(Number(attachment?.height) || 3))
  return { aspectRatio: `${width} / ${height}` }
}

export function buildChatPhotoPath(thread = 'ops', now = new Date(), id = crypto.randomUUID()) {
  const safeThread = /^[a-z0-9_-]+$/i.test(String(thread || '')) ? String(thread) : 'ops'
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${safeThread}/${yyyy}/${mm}/${id}.jpg`
}

export function toStoredImageAttachment({ path, width, height, size }) {
  return {
    type: 'image',
    bucket: CHAT_PHOTOS_BUCKET,
    path,
    mime: 'image/jpeg',
    width: Math.max(1, Math.round(Number(width) || 1)),
    height: Math.max(1, Math.round(Number(height) || 1)),
    size: Math.max(0, Math.round(Number(size) || 0))
  }
}

function drawToJpegBlob(source, sourceWidth, sourceHeight) {
  const longest = Math.max(sourceWidth, sourceHeight)
  const scale = longest > CHAT_PHOTO_MAX_EDGE ? CHAT_PHOTO_MAX_EDGE / longest : 1
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error(CHAT_PHOTO_READ_ERROR)
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(CHAT_PHOTO_READ_ERROR))
        return
      }
      resolve({ blob, width, height, size: blob.size })
    }, 'image/jpeg', CHAT_PHOTO_JPEG_QUALITY)
  })
}

function decodeWithImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(CHAT_PHOTO_READ_ERROR))
    }
    image.src = url
  })
}

/**
 * Decode (honoring EXIF orientation), scale the long edge to 1600px,
 * and encode a JPEG at quality 0.8. Throws a friendly error if the
 * file cannot be decoded (common for some HEIC files outside Safari).
 */
export async function compressChatImage(file) {
  if (!isProbablyImageFile(file)) {
    throw new Error('Choose a photo.')
  }
  if (!file.size) {
    throw new Error(CHAT_PHOTO_READ_ERROR)
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      try {
        return await drawToJpegBlob(bitmap, bitmap.width, bitmap.height)
      } finally {
        bitmap.close?.()
      }
    } catch (error) {
      console.warn('createImageBitmap failed, trying Image():', error)
    }
  }

  const image = await decodeWithImageElement(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error(CHAT_PHOTO_READ_ERROR)
  }
  return drawToJpegBlob(image, width, height)
}
