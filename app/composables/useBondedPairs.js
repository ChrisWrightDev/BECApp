import { withTimeout } from '~/utils/loadState'

export const BONDED_PAIR_VIDEO_BUCKET = 'bonded-pair-videos'
export const MAX_VIDEO_BYTES = 524288000
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

const PRICE_CENTS_MAX = 10000000
const DOLLAR_PATTERN = /^\d+(\.\d{1,2})?$/

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const centsToDollars = (cents) => {
  if (cents == null || !Number.isFinite(Number(cents))) return ''
  return (Number(cents) / 100).toFixed(2)
}

export const formatPairPrice = (cents) => {
  const dollars = centsToDollars(cents)
  return dollars ? `$${dollars}` : '—'
}

export const parsePriceCents = (raw) => {
  const trimmed = String(raw ?? '').trim().replace(/^\$/, '').trim()
  if (!trimmed) return { ok: false, reason: 'Enter a price' }
  if (/\.\d{3,}/.test(trimmed)) {
    return { ok: false, reason: 'Use at most 2 decimal places' }
  }
  if (!DOLLAR_PATTERN.test(trimmed)) {
    return { ok: false, reason: 'Enter a valid dollar amount' }
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0.01) {
    return { ok: false, reason: 'Minimum is $0.01' }
  }
  const cents = Math.round(value * 100)
  if (cents <= 0 || cents > PRICE_CENTS_MAX) {
    return { ok: false, reason: 'Price is out of range' }
  }
  return { ok: true, cents }
}

const objectPathFromValue = (value) => {
  if (!value) return null
  const raw = String(value)
  if (!raw.includes('://')) return raw.replace(/^\/+/, '')
  const marker = `/object/public/${BONDED_PAIR_VIDEO_BUCKET}/`
  const idx = raw.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(raw.slice(idx + marker.length))
}

const writeError = (error, fallback) => {
  if (error?.code === '23505') return new Error('That slug is already in use')
  return error instanceof Error ? error : new Error(error?.message || fallback)
}

const extensionForFile = (file) => {
  const name = file?.name || ''
  const fromName = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  if (fromName === 'mov' || fromName === 'qt') return 'mov'
  if (fromName === 'webm') return 'webm'
  if (fromName === 'mp4' || fromName === 'm4v') return 'mp4'
  if (file?.type === 'video/quicktime') return 'mov'
  if (file?.type === 'video/webm') return 'webm'
  return 'mp4'
}

const contentTypeForFile = (file) => {
  if (file?.type && ALLOWED_VIDEO_TYPES.includes(file.type)) return file.type
  const ext = extensionForFile(file)
  if (ext === 'mov') return 'video/quicktime'
  if (ext === 'webm') return 'video/webm'
  return 'video/mp4'
}

export const validateVideoFile = (file) => {
  if (!file) return { ok: false, reason: 'Choose a video to upload' }
  const ext = extensionForFile(file)
  const allowedExt = ['mp4', 'mov', 'webm']
  const typeAllowed = ALLOWED_VIDEO_TYPES.includes(file.type)
  if ((file.type && !typeAllowed && !allowedExt.includes(ext)) || (!file.type && !allowedExt.includes(ext))) {
    return { ok: false, reason: 'Use an MP4, MOV, or WebM video' }
  }
  const type = typeAllowed ? file.type : contentTypeForFile(file)
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, reason: 'Video is too large (max 500 MB)' }
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'That video file is empty' }
  }
  return { ok: true, type, ext }
}

const capturePosterBlob = (file) =>
  new Promise((resolve, reject) => {
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
      video.removeAttribute('src')
      video.load()
    }

    const fail = (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      reject(err instanceof Error ? err : new Error('Could not capture a poster frame'))
    }

    const timer = setTimeout(() => fail(new Error('Poster capture timed out')), 12000)

    video.addEventListener('loadeddata', () => {
      const target = Number.isFinite(video.duration) && video.duration > 1 ? 1 : 0.1
      try {
        video.currentTime = target
      } catch (err) {
        fail(err)
      }
    })

    video.addEventListener('seeked', () => {
      if (settled) return
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 640
        const height = video.videoHeight || 360
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          fail(new Error('Canvas is not available'))
          return
        }
        ctx.drawImage(video, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) {
            fail(new Error('Could not create poster image'))
            return
          }
          settled = true
          clearTimeout(timer)
          cleanup()
          resolve(blob)
        }, 'image/jpeg', 0.82)
      } catch (err) {
        fail(err)
      }
    })

    video.addEventListener('error', () => fail(new Error('Could not load video for poster')))
    video.src = objectUrl
  })

export const useBondedPairs = () => {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  const publicUrl = (path) => {
    const objectPath = objectPathFromValue(path)
    if (!objectPath) return ''
    const { data } = supabase.storage.from(BONDED_PAIR_VIDEO_BUCKET).getPublicUrl(objectPath)
    return data?.publicUrl || ''
  }

  const pairMediaUrls = (pair) => ({
    videoUrl: publicUrl(pair?.video_path) || '',
    posterUrl: publicUrl(pair?.video_poster_path) || pair?.image_url || ''
  })

  const fetchPairs = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('bonded_pairs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
    )
    if (error) throw error
    return data || []
  }

  const createPair = async (payload) => {
    const { data, error } = await supabase
      .from('bonded_pairs')
      .insert(payload)
      .select()
      .single()
    if (error) throw writeError(error, 'Failed to create pair')
    return data
  }

  const updatePair = async (id, payload) => {
    const { data, error } = await supabase
      .from('bonded_pairs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw writeError(error, 'Failed to update pair')
    return data
  }

  const listPairObjectPaths = async (pairId) => {
    const { data, error } = await supabase.storage.from(BONDED_PAIR_VIDEO_BUCKET).list(pairId, {
      limit: 100
    })
    if (error) return []
    return (data || [])
      .map((file) => file?.name)
      .filter(Boolean)
      .map((name) => `${pairId}/${name}`)
  }

  const removeStoragePaths = async (paths) => {
    const unique = [...new Set((paths || []).map(objectPathFromValue).filter(Boolean))]
    if (!unique.length) return
    const { error } = await supabase.storage.from(BONDED_PAIR_VIDEO_BUCKET).remove(unique)
    if (error) throw error
  }

  const collectPairPaths = async (pair) => {
    const known = [pair?.video_path, pair?.video_poster_path]
    const listed = pair?.id ? await listPairObjectPaths(pair.id) : []
    return [...known, ...listed]
  }

  const deletePair = async (pair) => {
    try {
      await removeStoragePaths(await collectPairPaths(pair))
    } catch (err) {
      console.warn('Could not remove pair videos:', err)
    }
    const { error } = await supabase.from('bonded_pairs').delete().eq('id', pair.id)
    if (error) throw writeError(error, 'Failed to delete pair')
  }

  const uploadObjectWithProgress = ({ path, body, contentType, onProgress }) =>
    new Promise((resolve, reject) => {
      const run = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          reject(new Error('You must be signed in to upload'))
          return
        }

        const encodedPath = path
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')
        const url = `${config.public.supabaseUrl}/storage/v1/object/${BONDED_PAIR_VIDEO_BUCKET}/${encodedPath}`
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
        xhr.setRequestHeader('apikey', config.public.supabaseAnonKey)
        xhr.setRequestHeader('x-upsert', 'false')

        const formData = new FormData()
        formData.append('cacheControl', '3600')
        if (typeof Blob !== 'undefined' && body instanceof Blob) {
          const fileName = body instanceof File && body.name
            ? body.name
            : contentType === 'image/jpeg' ? 'poster.jpg' : 'video'
          formData.append('', body, fileName)
        } else {
          formData.append('', body)
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && typeof onProgress === 'function') {
            onProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              resolve({ path })
            }
            return
          }
          let message = 'Upload failed'
          try {
            const parsed = JSON.parse(xhr.responseText)
            message = parsed.message || parsed.error || message
          } catch {
            if (xhr.statusText) message = xhr.statusText
          }
          reject(new Error(message))
        }

        xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
        xhr.onabort = () => reject(new Error('Upload cancelled'))
        xhr.send(formData)
      }

      run().catch(reject)
    })

  const uploadVideo = async (pair, file, { onProgress } = {}) => {
    const check = validateVideoFile(file)
    if (!check.ok) throw new Error(check.reason)
    if (!pair?.id) throw new Error('Save the pair before uploading a video')

    const stamp = Date.now()
    const videoPath = `${pair.id}/${stamp}.${check.ext}`
    const posterPath = `${pair.id}/${stamp}-poster.jpg`
    const previousPaths = [pair.video_path, pair.video_poster_path]

    if (typeof onProgress === 'function') onProgress(0)

    try {
      await uploadObjectWithProgress({
        path: videoPath,
        body: file,
        contentType: check.type,
        onProgress
      })
    } catch (err) {
      throw new Error(err?.message || 'Video upload failed')
    }

    let nextPosterPath = null
    try {
      const posterBlob = await capturePosterBlob(file)
      await uploadObjectWithProgress({
        path: posterPath,
        body: posterBlob,
        contentType: 'image/jpeg'
      })
      nextPosterPath = posterPath
    } catch (err) {
      console.warn('Skipping poster frame:', err)
    }

    let saved
    try {
      saved = await updatePair(pair.id, {
        video_path: videoPath,
        video_poster_path: nextPosterPath
      })
    } catch (err) {
      try {
        await removeStoragePaths([videoPath, posterPath])
      } catch (cleanupError) {
        console.warn('Could not clean up failed video upload:', cleanupError)
      }
      throw err
    }

    try {
      await removeStoragePaths(previousPaths)
    } catch (err) {
      console.warn('Could not remove the previous video:', err)
    }

    if (typeof onProgress === 'function') onProgress(100)
    return saved
  }

  const removeVideo = async (pair) => {
    const saved = await updatePair(pair.id, {
      video_path: null,
      video_poster_path: null
    })
    try {
      await removeStoragePaths(await collectPairPaths(pair))
    } catch (err) {
      console.warn('Could not remove video files:', err)
    }
    return saved
  }

  return {
    fetchPairs,
    createPair,
    updatePair,
    deletePair,
    uploadVideo,
    removeVideo,
    publicUrl,
    pairMediaUrls
  }
}
