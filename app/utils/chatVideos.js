// Ops Chat video attachments stored on public.messages.attachments.
// Shape of each element:
// {
//   "type": "video",
//   "bucket": "chat-videos",
//   "path": "<thread>/<yyyy>/<mm>/<uuid>.mp4|mov",
//   "mime": "video/mp4" | "video/quicktime",
//   "width": <int>,
//   "height": <int>,
//   "size": <bytes>,
//   "posterBucket": "chat-photos",
//   "posterPath": "<thread>/<yyyy>/<mm>/<uuid>.jpg"
// }
//
// Videos are not compressed or transcoded. An optional JPEG poster is
// captured in the browser and stored in the existing chat-photos bucket.

import { CHAT_PHOTOS_BUCKET, MAX_CHAT_PHOTOS, isProbablyImageFile } from './chatPhotos.js'

export const CHAT_VIDEOS_BUCKET = 'chat-videos'
export const CHAT_VIDEO_POSTER_BUCKET = CHAT_PHOTOS_BUCKET
export const MAX_CHAT_VIDEO_BYTES = 50 * 1024 * 1024
export const MAX_CHAT_VIDEOS = 1
export const CHAT_VIDEO_TOO_BIG_ERROR = 'That video is over 50 MB. Choose a shorter clip.'
export const CHAT_VIDEO_TYPE_ERROR = 'That file isn\'t supported. Choose a photo, or an MP4 or MOV video.'
export const CHAT_VIDEO_EMPTY_ERROR = 'That video file is empty. Please choose a different one.'
export const CHAT_VIDEO_LIMIT_ERROR = 'You can attach one video at a time.'
export const CHAT_VIDEO_LIMIT_PENDING_ERROR = 'You can attach one video at a time. Remove the current video first.'
export const CHAT_PHOTO_LIMIT_ERROR = 'You can attach up to 4 photos.'

const GENERIC_VIDEO_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

export function fileExtension(file) {
  const name = String(file?.name || '')
  const match = /\.([a-z0-9]+)$/i.exec(name)
  return match ? match[1].toLowerCase() : ''
}

export function normalizedMime(file) {
  return String(file?.type || '').toLowerCase().split(';')[0].trim()
}

/**
 * mp4 and mov only. iPhone camera-roll videos are often .MOV with an
 * empty or generic MIME type, so the extension is accepted in that case.
 * Returns null for photos and for anything else.
 */
export function chatVideoFileInfo(file) {
  if (!file) return null
  const type = normalizedMime(file)
  const ext = fileExtension(file)
  if (type.startsWith('image/')) return null

  if (type === 'video/mp4') return { kind: 'mp4', mime: 'video/mp4', ext: 'mp4' }
  if (type === 'video/quicktime' || type === 'video/x-quicktime') {
    return { kind: 'mov', mime: 'video/quicktime', ext: 'mov' }
  }

  if (GENERIC_VIDEO_TYPES.has(type)) {
    if (ext === 'mp4') return { kind: 'mp4', mime: 'video/mp4', ext: 'mp4' }
    if (ext === 'mov' || ext === 'qt') return { kind: 'mov', mime: 'video/quicktime', ext: 'mov' }
  }

  return null
}

export function chatVideoRejection(file) {
  const info = chatVideoFileInfo(file)
  if (!info) return CHAT_VIDEO_TYPE_ERROR
  const size = Number(file.size)
  if (!Number.isFinite(size) || size <= 0) return CHAT_VIDEO_EMPTY_ERROR
  if (size > MAX_CHAT_VIDEO_BYTES) return CHAT_VIDEO_TOO_BIG_ERROR
  return null
}

export function videoAttachments(message) {
  const list = message?.attachments
  if (!Array.isArray(list)) return []
  return list.filter((item) => item && item.type === 'video' && (item.path || item.previewUrl))
}

export function messageHasVideo(message) {
  return videoAttachments(message).length > 0
}

export function buildChatVideoPath(thread = 'ops', now = new Date(), id = crypto.randomUUID(), kind = 'mp4') {
  const safeThread = /^[a-z0-9_-]+$/i.test(String(thread || '')) ? String(thread) : 'ops'
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const ext = kind === 'mov' ? 'mov' : 'mp4'
  return `${safeThread}/${yyyy}/${mm}/${id}.${ext}`
}

export function toStoredVideoAttachment({ path, mime, width, height, size, posterPath }) {
  const stored = {
    type: 'video',
    bucket: CHAT_VIDEOS_BUCKET,
    path,
    mime: mime === 'video/quicktime' ? 'video/quicktime' : 'video/mp4',
    width: Math.max(1, Math.round(Number(width) || 16)),
    height: Math.max(1, Math.round(Number(height) || 9)),
    size: Math.max(0, Math.round(Number(size) || 0))
  }
  if (posterPath) {
    stored.posterBucket = CHAT_VIDEO_POSTER_BUCKET
    stored.posterPath = posterPath
  }
  return stored
}

/**
 * Split a picker selection into photos to compress and at most one video.
 * Every rejected file produces an error string. Nothing is dropped quietly.
 */
export function classifyChatFiles(files, { pendingPhotoCount = 0, hasPendingVideo = false, maxPhotos = MAX_CHAT_PHOTOS } = {}) {
  const images = []
  const videos = []
  const errors = []

  for (const file of files || []) {
    if (isProbablyImageFile(file)) {
      images.push(file)
      continue
    }
    const rejection = chatVideoRejection(file)
    if (rejection) {
      errors.push(rejection)
      continue
    }
    videos.push(file)
  }

  const acceptedVideos = []
  if (videos.length) {
    if (hasPendingVideo) {
      errors.push(CHAT_VIDEO_LIMIT_PENDING_ERROR)
    } else {
      acceptedVideos.push(videos[0])
      if (videos.length > MAX_CHAT_VIDEOS) errors.push(CHAT_VIDEO_LIMIT_ERROR)
    }
  }

  let acceptedImages = images
  if (images.length) {
    const room = maxPhotos - pendingPhotoCount
    if (room <= 0) {
      errors.push(CHAT_PHOTO_LIMIT_ERROR)
      acceptedImages = []
    } else if (images.length > room) {
      errors.push(CHAT_PHOTO_LIMIT_ERROR)
      acceptedImages = images.slice(0, room)
    }
  }

  return { images: acceptedImages, videos: acceptedVideos, errors }
}

/**
 * Read dimensions and an optional JPEG poster. Never rejects: a video
 * that the browser cannot decode is still sendable (iPhone MOV).
 */
export function readChatVideoPreview(file) {
  return new Promise((resolve) => {
    const fallback = { width: 16, height: 9, posterBlob: null }
    if (!file || typeof document === 'undefined') {
      resolve(fallback)
      return
    }

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.setAttribute('playsinline', '')
    video.setAttribute('muted', '')

    const objectUrl = URL.createObjectURL(file)
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.pause?.()
      video.removeAttribute('src')
      video.load()
    }

    const finish = (width, height, posterBlob) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve({
        width: Math.max(1, Math.round(Number(width) || 16)),
        height: Math.max(1, Math.round(Number(height) || 9)),
        posterBlob: posterBlob || null
      })
    }

    const timer = setTimeout(() => finish(video.videoWidth, video.videoHeight, null), 8000)

    const capture = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) {
        finish(16, 9, null)
        return
      }
      try {
        const longest = Math.max(width, height)
        const scale = longest > 1600 ? 1600 / longest : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          finish(width, height, null)
          return
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => finish(width, height, blob), 'image/jpeg', 0.8)
      } catch {
        finish(width, height, null)
      }
    }

    video.addEventListener('error', () => finish(video.videoWidth, video.videoHeight, null))
    video.addEventListener('loadeddata', () => {
      const duration = video.duration
      const target = Number.isFinite(duration) && duration > 0.2 ? Math.min(0.1, duration / 2) : 0
      if (target <= 0) {
        capture()
        return
      }
      video.addEventListener('seeked', () => capture(), { once: true })
      try {
        video.currentTime = target
      } catch {
        capture()
      }
    }, { once: true })

    video.src = objectUrl
  })
}
