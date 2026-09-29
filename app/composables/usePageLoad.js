import { LOAD_TIMEOUT_MS, withTimeout } from '~/utils/loadState'

/**
 * Page-level load guard: always clears `loading` in finally, surfaces errors,
 * and times out after ~15s so a spinner can never hang forever.
 */
export const usePageLoad = (loadFn, { timeoutMs = LOAD_TIMEOUT_MS } = {}) => {
  const loading = ref(true)
  const error = ref(null)

  const load = async (...args) => {
    loading.value = true
    error.value = null
    try {
      await withTimeout(Promise.resolve().then(() => loadFn(...args)), timeoutMs)
    } catch (err) {
      error.value = err?.message || 'Failed to load data'
      console.error('Page load failed:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    load,
    retry: load
  }
}
