export const useSync = () => {
  const isOnline = useState('isOnline', () => true)
  const syncQueue = useState('syncQueue', () => [])
  const lastSyncTime = useState('lastSyncTime', () => null)
  const syncing = useState('syncing', () => false)
  const conflicts = useState('conflicts', () => [])

  // Computed getters
  const hasPendingSync = computed(() => syncQueue.value.length > 0)
  const isOffline = computed(() => !isOnline.value)

  // Actions
  const setOnlineStatus = (status) => {
    isOnline.value = status
    if (status && hasPendingSync.value) {
      processSyncQueue()
    }
  }

  const addToSyncQueue = (action) => {
    syncQueue.value.push({
      ...action,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    })
  }

  const removeFromSyncQueue = (id) => {
    syncQueue.value = syncQueue.value.filter(item => item.id !== id)
  }

  const clearSyncQueue = () => {
    syncQueue.value = []
  }

  const setSyncing = (isSyncing) => {
    syncing.value = isSyncing
  }

  const setLastSyncTime = (time) => {
    lastSyncTime.value = time
  }

  const addConflict = (conflict) => {
    conflicts.value.push(conflict)
  }

  const resolveConflict = (conflictId, resolution) => {
    const index = conflicts.value.findIndex(c => c.id === conflictId)
    if (index !== -1) {
      conflicts.value[index].resolved = true
      conflicts.value[index].resolution = resolution
    }
  }

  const processSyncQueue = async () => {
    if (syncing.value || !isOnline.value || !hasPendingSync.value) {
      return
    }

    setSyncing(true)
    try {
      // Process sync queue items
      // This will be implemented with actual Supabase sync logic
      const queue = [...syncQueue.value]
      clearSyncQueue()
      setLastSyncTime(new Date().toISOString())
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  return {
    // State
    isOnline: readonly(isOnline),
    syncQueue: readonly(syncQueue),
    lastSyncTime: readonly(lastSyncTime),
    syncing: readonly(syncing),
    conflicts: readonly(conflicts),
    // Getters
    hasPendingSync,
    isOffline,
    // Actions
    setOnlineStatus,
    addToSyncQueue,
    removeFromSyncQueue,
    clearSyncQueue,
    setSyncing,
    setLastSyncTime,
    addConflict,
    resolveConflict,
    processSyncQueue
  }
}

