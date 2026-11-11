import { withTimeout } from '~/utils/loadState'
import {
  CHAT_VIDEOS_BUCKET,
  MAX_CHAT_VIDEO_BYTES,
  CHAT_VIDEO_TOO_BIG_ERROR,
  CHAT_VIDEO_TYPE_ERROR,
  CHAT_VIDEO_EMPTY_ERROR,
  videoAttachments
} from '~/utils/chatVideos'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const REFRESH_EARLY_MS = 5 * 60 * 1000
const SIGNED_URL_BATCH = 100
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000
const UPLOAD_STALL_MS = 60 * 1000

const memoryCache = new Map()

const readFresh = (path) => {
  const hit = memoryCache.get(path)
  if (!hit) return ''
  if (hit.expiresAt - REFRESH_EARLY_MS <= Date.now()) return ''
  return hit.url
}

const friendlyUploadError = (status, raw) => {
  const text = String(raw || '')
  if (status === 413 || /exceeded the maximum|payload too large|maximum allowed size|too large/i.test(text)) {
    return CHAT_VIDEO_TOO_BIG_ERROR
  }
  if (status === 415 || /mime type|invalid mime|not supported/i.test(text)) {
    return 'That video type isn\'t supported. Use an MP4 or MOV file.'
  }
  if (/bucket not found|bucket does not exist/i.test(text)) {
    return 'Video uploads are not enabled yet. The chat-videos bucket still needs to be created.'
  }
  return text || 'Video upload failed. Check your connection and try again.'
}

export const useChatVideos = () => {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()
  const urls = useState('chatVideoUrls', () => ({}))
  const failedPaths = useState('chatVideoFailedPaths', () => ({}))

  const publish = (path, url) => {
    memoryCache.set(path, {
      url,
      expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000
    })
    if (urls.value[path] !== url) {
      urls.value = { ...urls.value, [path]: url }
    }
    if (failedPaths.value[path]) {
      const nextFailed = { ...failedPaths.value }
      delete nextFailed[path]
      failedPaths.value = nextFailed
    }
  }

  const markFailed = (path) => {
    if (!path || failedPaths.value[path]) return
    failedPaths.value = { ...failedPaths.value, [path]: true }
  }

  const videoUrl = (path) => {
    if (!path) return ''
    return urls.value[path] || readFresh(path) || ''
  }

  const videoFailed = (path) => Boolean(path && failedPaths.value[path])

  const forgetVideoUrl = (path) => {
    if (!path) return
    memoryCache.delete(path)
    if (urls.value[path]) {
      const next = { ...urls.value }
      delete next[path]
      urls.value = next
    }
  }

  const ensureVideoUrl = async (path) => {
    if (!path) return ''
    const cached = readFresh(path)
    if (cached) {
      publish(path, cached)
      return cached
    }
    try {
      const { data, error } = await withTimeout(
        supabase.storage
          .from(CHAT_VIDEOS_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      )
      const signed = data?.signedUrl || data?.signedURL || ''
      if (error || !signed) {
        markFailed(path)
        return ''
      }
      publish(path, signed)
      return signed
    } catch (error) {
      console.warn('Chat video signed URL failed:', error)
      markFailed(path)
      return ''
    }
  }

  const primeVideoUrls = async (messages) => {
    const paths = []
    for (const message of messages || []) {
      for (const attachment of videoAttachments(message)) {
        if (!attachment.path || attachment.previewUrl) continue
        if (readFresh(attachment.path)) {
          publish(attachment.path, readFresh(attachment.path))
          continue
        }
        if (!paths.includes(attachment.path)) paths.push(attachment.path)
      }
    }
    if (!paths.length) return

    for (let index = 0; index < paths.length; index += SIGNED_URL_BATCH) {
      const chunk = paths.slice(index, index + SIGNED_URL_BATCH)
      try {
        const { data, error } = await withTimeout(
          supabase.storage
            .from(CHAT_VIDEOS_BUCKET)
            .createSignedUrls(chunk, SIGNED_URL_TTL_SECONDS)
        )
        if (error) {
          await Promise.all(chunk.map((path) => ensureVideoUrl(path)))
          continue
        }
        const returned = new Set()
        for (const row of data || []) {
          const signed = row?.signedUrl || row?.signedURL || ''
          if (row?.path) returned.add(row.path)
          if (row?.path && signed && !row.error) {
            publish(row.path, signed)
          } else if (row?.path) {
            markFailed(row.path)
          }
        }
        for (const path of chunk) {
          if (!returned.has(path)) markFailed(path)
        }
      } catch (error) {
        console.warn('Chat video signed URL batch failed:', error)
        chunk.forEach((path) => markFailed(path))
      }
    }
  }

  const uploadChatVideo = ({ path, body, contentType, onProgress }) => new Promise((resolve, reject) => {
    const run = async () => {
      if (contentType !== 'video/mp4' && contentType !== 'video/quicktime') {
        reject(new Error(CHAT_VIDEO_TYPE_ERROR))
        return
      }
      if (!body || !(body.size > 0)) {
        reject(new Error(CHAT_VIDEO_EMPTY_ERROR))
        return
      }
      if (body.size > MAX_CHAT_VIDEO_BYTES) {
        reject(new Error(CHAT_VIDEO_TOO_BIG_ERROR))
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        reject(new Error('You must be signed in to send videos'))
        return
      }

      const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
      const url = `${config.public.supabaseUrl}/storage/v1/object/${CHAT_VIDEOS_BUCKET}/${encodedPath}`
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', config.public.supabaseAnonKey)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.setRequestHeader('cache-control', '3600')
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.timeout = UPLOAD_TIMEOUT_MS

      let stalled = false
      let stallTimer = null
      const clearStall = () => {
        if (stallTimer) {
          clearTimeout(stallTimer)
          stallTimer = null
        }
      }
      const armStall = () => {
        clearStall()
        stallTimer = setTimeout(() => {
          stalled = true
          xhr.abort()
        }, UPLOAD_STALL_MS)
      }

      xhr.upload.onloadstart = () => armStall()
      xhr.upload.onprogress = (event) => {
        armStall()
        if (event.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        }
      }

      xhr.onload = () => {
        clearStall()
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ path })
          return
        }
        let raw = ''
        try {
          const parsed = JSON.parse(xhr.responseText)
          raw = parsed.message || parsed.error || parsed.error_description || ''
        } catch {
          raw = xhr.responseText || xhr.statusText || ''
        }
        reject(new Error(friendlyUploadError(xhr.status, raw)))
      }

      xhr.onerror = () => {
        clearStall()
        reject(new Error('Video upload failed. Check your connection and try again.'))
      }
      xhr.ontimeout = () => {
        clearStall()
        reject(new Error('Video upload timed out. Tap to retry.'))
      }
      xhr.onabort = () => {
        clearStall()
        reject(new Error(stalled
          ? 'Video upload stalled. Check your connection and tap to retry.'
          : 'Video upload cancelled'))
      }

      const payload = body.type === contentType ? body : body.slice(0, body.size, contentType)
      armStall()
      xhr.send(payload)
    }

    run().catch(reject)
  })

  return {
    videoUrl,
    videoFailed,
    markVideoFailed: markFailed,
    forgetVideoUrl,
    ensureVideoUrl,
    primeVideoUrls,
    uploadChatVideo
  }
}
