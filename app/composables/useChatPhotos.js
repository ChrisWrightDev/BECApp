import { withTimeout } from '~/utils/loadState'
import {
  CHAT_PHOTOS_BUCKET,
  imageAttachments
} from '~/utils/chatPhotos'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const REFRESH_EARLY_MS = 5 * 60 * 1000
const SIGNED_URL_BATCH = 100

const memoryCache = new Map()

const readFresh = (path) => {
  const hit = memoryCache.get(path)
  if (!hit) return ''
  if (hit.expiresAt - REFRESH_EARLY_MS <= Date.now()) return ''
  return hit.url
}

export const useChatPhotos = () => {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()
  const urls = useState('chatPhotoUrls', () => ({}))
  const failedPaths = useState('chatPhotoFailedPaths', () => ({}))

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

  const photoUrl = (path) => {
    if (!path) return ''
    return urls.value[path] || readFresh(path) || ''
  }

  const photoFailed = (path) => Boolean(path && failedPaths.value[path])

  const forgetPhotoUrl = (path) => {
    if (!path) return
    memoryCache.delete(path)
    if (urls.value[path]) {
      const next = { ...urls.value }
      delete next[path]
      urls.value = next
    }
  }

  const ensurePhotoUrl = async (path) => {
    if (!path) return ''
    const cached = readFresh(path)
    if (cached) {
      publish(path, cached)
      return cached
    }
    try {
      const { data, error } = await withTimeout(
        supabase.storage
          .from(CHAT_PHOTOS_BUCKET)
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
      console.warn('Chat photo signed URL failed:', error)
      markFailed(path)
      return ''
    }
  }

  const primePhotoUrls = async (messages) => {
    const paths = []
    for (const message of messages || []) {
      for (const attachment of imageAttachments(message)) {
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
            .from(CHAT_PHOTOS_BUCKET)
            .createSignedUrls(chunk, SIGNED_URL_TTL_SECONDS)
        )
        if (error) {
          await Promise.all(chunk.map((path) => ensurePhotoUrl(path)))
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
        console.warn('Chat photo signed URL batch failed:', error)
        chunk.forEach((path) => markFailed(path))
      }
    }
  }

  const uploadChatPhoto = ({ path, blob, onProgress }) => new Promise((resolve, reject) => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        reject(new Error('You must be signed in to send photos'))
        return
      }

      const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
      const url = `${config.public.supabaseUrl}/storage/v1/object/${CHAT_PHOTOS_BUCKET}/${encodedPath}`
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', config.public.supabaseAnonKey)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.setRequestHeader('cache-control', '3600')
      xhr.setRequestHeader('Content-Type', 'image/jpeg')
      xhr.timeout = 60000

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ path })
          return
        }
        let message = 'Photo upload failed'
        try {
          const parsed = JSON.parse(xhr.responseText)
          message = parsed.message || parsed.error || message
        } catch {
          if (xhr.statusText) message = xhr.statusText
        }
        reject(new Error(message))
      }

      xhr.onerror = () => reject(new Error('Photo upload failed. Check your connection and try again.'))
      xhr.ontimeout = () => reject(new Error('Photo upload timed out. Tap to retry.'))
      xhr.onabort = () => reject(new Error('Photo upload cancelled'))
      xhr.send(blob)
    }

    run().catch(reject)
  })

  const removeChatPhotos = async (paths) => {
    const unique = [...new Set((paths || []).filter(Boolean))]
    if (!unique.length) return
    const { error } = await supabase.storage.from(CHAT_PHOTOS_BUCKET).remove(unique)
    if (error) {
      console.warn('Could not remove chat photos:', error.message || error)
    }
  }

  return {
    photoUrl,
    photoFailed,
    markPhotoFailed: markFailed,
    forgetPhotoUrl,
    ensurePhotoUrl,
    primePhotoUrls,
    uploadChatPhoto,
    removeChatPhotos
  }
}
