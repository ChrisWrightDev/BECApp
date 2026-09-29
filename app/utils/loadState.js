export const LOAD_TIMEOUT_MS = 15000
export const LOAD_TIMEOUT_MESSAGE = 'This is taking too long. Check your connection and try again.'

export function createTimeoutError(message = LOAD_TIMEOUT_MESSAGE) {
  const error = new Error(message)
  error.name = 'LoadTimeoutError'
  return error
}

export async function withTimeout(promise, timeoutMs = LOAD_TIMEOUT_MS) {
  let timeoutId
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs)
      })
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Run a data-load function with a 15s timeout and always clear `loading` in finally.
 * Sets `error` on failure. Re-throws so callers can return their usual { data, error } shape.
 */
export async function runLoad({ loading, error }, fn, { timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  loading.value = true
  if (error) error.value = null

  try {
    return await withTimeout(Promise.resolve().then(fn), timeoutMs)
  } catch (err) {
    if (error) {
      error.value = err?.message || 'Failed to load data'
    }
    throw err
  } finally {
    loading.value = false
  }
}
