<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-4">Bonded Pairs (Shop)</h1>
        <p class="text-base-content/70">
          WYSIWYG pairs and videos for the shop website
        </p>
      </div>
      <button type="button" class="btn btn-primary w-full sm:w-auto" @click="openEditor()">
        <Icon name="mdi:plus" class="w-4 h-4" />
        New pair
      </button>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="pairs.length === 0"
      empty-icon="mdi:storefront"
      empty-title="No bonded pairs yet"
      empty-description="Add a pair and upload a video so buyers see exactly what they get"
      @retry="retry"
    >
      <template #empty-action>
        <button type="button" class="btn btn-primary mt-4" @click="openEditor()">
          Add a pair
        </button>
      </template>

      <div class="space-y-3">
        <div
          v-for="pair in pairs"
          :key="pair.id"
          class="card bg-base-100 shadow-xl"
        >
          <div class="card-body p-4">
            <div class="flex items-start gap-3">
              <div class="pair-thumb shrink-0 overflow-hidden rounded-lg bg-base-200">
                <video
                  v-if="pair.video_path"
                  :src="pairMediaUrls(pair).videoUrl"
                  :poster="pairMediaUrls(pair).posterUrl || undefined"
                  muted
                  playsinline
                  preload="metadata"
                  class="h-full w-full object-cover"
                />
                <img
                  v-else-if="pair.image_url"
                  :src="pair.image_url"
                  :alt="pair.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-base-content/40">
                  <Icon name="mdi:video-outline" class="w-8 h-8" />
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold break-words">{{ pair.name }}</h2>
                <p class="text-base-content/70 mt-1">{{ formatPairPrice(pair.price_cents) }}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  <span class="badge badge-sm" :class="statusBadgeClass(pair.status)">
                    {{ statusLabel(pair.status) }}
                  </span>
                  <span v-if="pair.video_path" class="badge badge-sm badge-ghost">Video</span>
                  <span v-if="pair.tank_label" class="badge badge-sm badge-ghost">{{ pair.tank_label }}</span>
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-primary w-full mt-3" @click="openEditor(pair)">
              <Icon name="mdi:pencil" class="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </PageLoadState>

    <dialog ref="editorModal" class="modal">
      <div class="modal-box w-11/12 max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ editingPair ? 'Edit bonded pair' : 'New bonded pair' }}
        </h3>
        <form class="space-y-4" @submit.prevent="savePair">
          <div class="form-control">
            <label class="label py-1" for="pair-name">
              <span class="label-text">Name</span>
            </label>
            <input
              id="pair-name"
              v-model="form.name"
              type="text"
              required
              class="input input-bordered ios-field"
              autocomplete="off"
              @input="onNameInput"
            />
          </div>

          <div class="form-control">
            <label class="label py-1" for="pair-slug">
              <span class="label-text">Slug</span>
            </label>
            <input
              id="pair-slug"
              v-model="form.slug"
              type="text"
              required
              class="input input-bordered ios-field"
              autocomplete="off"
              @input="onSlugInput"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label py-1" for="pair-male">
                <span class="label-text">Male morph</span>
              </label>
              <input
                id="pair-male"
                v-model="form.male_morph"
                type="text"
                class="input input-bordered ios-field"
                autocomplete="off"
              />
            </div>
            <div class="form-control">
              <label class="label py-1" for="pair-female">
                <span class="label-text">Female morph</span>
              </label>
              <input
                id="pair-female"
                v-model="form.female_morph"
                type="text"
                class="input input-bordered ios-field"
                autocomplete="off"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label py-1" for="pair-description">
              <span class="label-text">Description</span>
            </label>
            <textarea
              id="pair-description"
              v-model="form.description"
              rows="3"
              class="textarea textarea-bordered ios-field"
            />
          </div>

          <div class="form-control">
            <label class="label py-1" for="pair-price">
              <span class="label-text">Price (USD)</span>
            </label>
            <label class="input input-bordered flex items-center gap-2 w-full ios-field">
              <span class="text-base-content/60" aria-hidden="true">$</span>
              <input
                id="pair-price"
                v-model="form.dollars"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                enterkeyhint="done"
                class="grow min-w-0 ios-field"
                :aria-invalid="Boolean(priceError)"
              />
            </label>
            <p v-if="priceError" class="text-error text-sm mt-2">{{ priceError }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label py-1" for="pair-status">
                <span class="label-text">Status</span>
              </label>
              <select id="pair-status" v-model="form.status" class="select select-bordered ios-field">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label py-1" for="pair-bonded-on">
                <span class="label-text">Bonded on</span>
              </label>
              <input
                id="pair-bonded-on"
                v-model="form.bonded_on"
                type="date"
                class="input input-bordered ios-field"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label py-1" for="pair-tank">
                <span class="label-text">Tank label</span>
              </label>
              <input
                id="pair-tank"
                v-model="form.tank_label"
                type="text"
                class="input input-bordered ios-field"
                autocomplete="off"
              />
            </div>
            <div class="form-control">
              <label class="label py-1" for="pair-sort">
                <span class="label-text">Sort order</span>
              </label>
              <input
                id="pair-sort"
                v-model.number="form.sort_order"
                type="number"
                class="input input-bordered ios-field"
              />
            </div>
          </div>

          <div class="divider">Video</div>

          <div v-if="previewVideoUrl" class="rounded-lg overflow-hidden bg-black">
            <video
              :src="previewVideoUrl"
              :poster="previewPosterUrl || undefined"
              playsinline
              muted
              controls
              class="w-full max-h-72"
            />
          </div>
          <p v-else class="text-sm text-base-content/60">
            Record or pick a video of this exact pair. Buyers will see this on the shop site.
          </p>

          <div class="form-control">
            <label class="label py-1" for="pair-video">
              <span class="label-text">{{ editingPair?.video_path ? 'Replace video' : 'Pair video' }}</span>
            </label>
            <input
              id="pair-video"
              ref="videoInput"
              type="file"
              accept="video/*"
              capture="environment"
              class="file-input file-input-bordered w-full ios-field"
              :disabled="uploading"
              @change="onVideoChosen"
            />
          </div>

          <div v-if="uploading" class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="loading loading-spinner loading-sm"></span>
              <span>{{ uploadLabel }}</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              :value="uploadProgress"
              max="100"
            />
          </div>
          <p v-if="videoError" class="text-error text-sm">{{ videoError }}</p>

          <button
            v-if="editingPair?.video_path"
            type="button"
            class="btn btn-ghost btn-sm text-error"
            :disabled="uploading || saving || removingVideo"
            @click="openRemoveVideo"
          >
            Remove video
          </button>

          <p v-if="formError" class="text-error text-sm">{{ formError }}</p>

          <div class="modal-action flex-wrap gap-2">
            <button
              v-if="editingPair"
              type="button"
              class="btn btn-error btn-outline mr-auto"
              :disabled="saving || uploading || deleting"
              @click="openDelete"
            >
              Delete
            </button>
            <button type="button" class="btn btn-ghost" :disabled="saving || uploading" @click="closeEditor">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving || uploading">
              <span v-if="saving" class="loading loading-spinner loading-sm"></span>
              {{ editingPair ? 'Save' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeEditor">close</button>
      </form>
    </dialog>

    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete bonded pair</h3>
        <p class="mb-4">
          Delete <strong>{{ editingPair?.name || 'this pair' }}</strong>?
          Its video will be removed too. This cannot be undone.
        </p>
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" :disabled="deleting" @click="closeDelete">
            Cancel
          </button>
          <button type="button" class="btn btn-error" :disabled="deleting" @click="confirmDelete">
            <span v-if="deleting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDelete">close</button>
      </form>
    </dialog>

    <dialog ref="removeVideoModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Remove video</h3>
        <p class="mb-4">Remove the uploaded video from this pair?</p>
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" :disabled="removingVideo" @click="closeRemoveVideo">
            Cancel
          </button>
          <button type="button" class="btn btn-error" :disabled="removingVideo" @click="confirmRemoveVideo">
            <span v-if="removingVideo" class="loading loading-spinner loading-sm"></span>
            Remove
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeRemoveVideo">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import {
  centsToDollars,
  formatPairPrice,
  parsePriceCents,
  slugify
} from '~/composables/useBondedPairs'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { showSuccess, showError } = useNotifications()
const {
  fetchPairs,
  createPair,
  updatePair,
  deletePair,
  uploadVideo,
  removeVideo,
  pairMediaUrls
} = useBondedPairs()

const pairs = ref([])
const editorModal = ref(null)
const deleteModal = ref(null)
const removeVideoModal = ref(null)
const videoInput = ref(null)
const editingPair = ref(null)
const slugManual = ref(false)
const pendingVideo = ref(null)
const saving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const deleting = ref(false)
const removingVideo = ref(false)
const formError = ref('')
const videoError = ref('')

const emptyForm = () => ({
  name: '',
  slug: '',
  male_morph: '',
  female_morph: '',
  description: '',
  dollars: '',
  status: 'available',
  bonded_on: '',
  tank_label: '',
  sort_order: 0
})

const form = ref(emptyForm())

const { loading, error, load: loadPairs, retry } = usePageLoad(async () => {
  pairs.value = await fetchPairs()
})

const priceError = computed(() => {
  if (!String(form.value.dollars || '').trim()) return ''
  const parsed = parsePriceCents(form.value.dollars)
  return parsed.ok ? '' : parsed.reason
})

const pendingPreviewUrl = ref('')

watch(pendingVideo, (file) => {
  if (pendingPreviewUrl.value) URL.revokeObjectURL(pendingPreviewUrl.value)
  pendingPreviewUrl.value = file ? URL.createObjectURL(file) : ''
})

const previewVideoUrl = computed(() => {
  if (pendingPreviewUrl.value) return pendingPreviewUrl.value
  return pairMediaUrls(editingPair.value).videoUrl
})

const previewPosterUrl = computed(() => pairMediaUrls(editingPair.value).posterUrl)

const uploadLabel = computed(() => {
  if (!uploading.value) return ''
  if (uploadProgress.value > 0 && uploadProgress.value < 100) {
    return `Uploading video… ${uploadProgress.value}%`
  }
  return 'Uploading video…'
})

const statusLabel = (status) => {
  if (status === 'reserved') return 'Reserved'
  if (status === 'sold') return 'Sold'
  return 'Available'
}

const statusBadgeClass = (status) => {
  if (status === 'reserved') return 'badge-warning'
  if (status === 'sold') return 'badge-ghost'
  return 'badge-success'
}

const nextSortOrder = () => {
  if (!pairs.value.length) return 0
  return Math.max(...pairs.value.map((pair) => Number(pair.sort_order) || 0)) + 1
}

const onNameInput = () => {
  if (!slugManual.value) {
    form.value.slug = slugify(form.value.name)
  }
}

const onSlugInput = () => {
  slugManual.value = true
  form.value.slug = slugify(form.value.slug)
}

const openEditor = (pair = null) => {
  formError.value = ''
  videoError.value = ''
  pendingVideo.value = null
  uploadProgress.value = 0
  if (videoInput.value) videoInput.value.value = ''

  if (pair?.id) {
    editingPair.value = pair
    slugManual.value = true
    form.value = {
      name: pair.name || '',
      slug: pair.slug || '',
      male_morph: pair.male_morph || '',
      female_morph: pair.female_morph || '',
      description: pair.description || '',
      dollars: centsToDollars(pair.price_cents),
      status: pair.status || 'available',
      bonded_on: pair.bonded_on || '',
      tank_label: pair.tank_label || '',
      sort_order: pair.sort_order ?? 0
    }
  } else {
    editingPair.value = null
    slugManual.value = false
    form.value = emptyForm()
    form.value.sort_order = nextSortOrder()
  }
  editorModal.value?.showModal()
}

const dismissEditor = () => {
  editorModal.value?.close()
  editingPair.value = null
  pendingVideo.value = null
  form.value = emptyForm()
  formError.value = ''
  videoError.value = ''
}

const closeEditor = () => {
  if (saving.value || uploading.value) return
  dismissEditor()
}

const refreshPairs = async () => {
  try {
    pairs.value = await fetchPairs()
  } catch (err) {
    console.error('Failed to refresh pairs:', err)
  }
}

const payloadFromForm = () => {
  const name = form.value.name.trim()
  const slug = slugify(form.value.slug || form.value.name)
  const parsed = parsePriceCents(form.value.dollars)
  if (!name) throw new Error('Enter a name')
  if (!slug) throw new Error('Enter a slug')
  if (!parsed.ok) throw new Error(parsed.reason)

  const sortOrder = Number(form.value.sort_order)
  return {
    name,
    slug,
    male_morph: form.value.male_morph.trim() || null,
    female_morph: form.value.female_morph.trim() || null,
    description: form.value.description.trim() || null,
    price_cents: parsed.cents,
    status: form.value.status || 'available',
    bonded_on: form.value.bonded_on || null,
    tank_label: form.value.tank_label.trim() || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
  }
}

const replacePairInList = (saved) => {
  const index = pairs.value.findIndex((pair) => pair.id === saved.id)
  if (index === -1) {
    pairs.value = [...pairs.value, saved].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return (a.sort_order || 0) - (b.sort_order || 0)
      return (a.name || '').localeCompare(b.name || '')
    })
    return
  }
  const next = [...pairs.value]
  next[index] = saved
  pairs.value = next
}

const runVideoUpload = async (pair, file) => {
  uploading.value = true
  uploadProgress.value = 0
  videoError.value = ''
  try {
    const saved = await uploadVideo(pair, file, {
      onProgress: (value) => {
        uploadProgress.value = value
      }
    })
    editingPair.value = saved
    replacePairInList(saved)
    pendingVideo.value = null
    if (videoInput.value) videoInput.value.value = ''
    showSuccess('Video uploaded')
    return saved
  } catch (err) {
    videoError.value = err?.message || 'Video upload failed'
    throw err
  } finally {
    uploading.value = false
  }
}

const onVideoChosen = async (event) => {
  const file = event.target.files?.[0]
  videoError.value = ''
  if (!file) {
    pendingVideo.value = null
    return
  }
  pendingVideo.value = file
  if (!editingPair.value?.id) return
  try {
    await runVideoUpload(editingPair.value, file)
  } catch (err) {
    console.error('Video upload failed:', err)
  }
}

const savePair = async () => {
  formError.value = ''
  videoError.value = ''
  let payload
  try {
    payload = payloadFromForm()
  } catch (err) {
    formError.value = err.message
    return
  }

  saving.value = true
  try {
    let saved
    if (editingPair.value?.id) {
      saved = await updatePair(editingPair.value.id, payload)
      editingPair.value = saved
      replacePairInList(saved)
      showSuccess('Pair saved')
    } else {
      saved = await createPair(payload)
      editingPair.value = saved
      replacePairInList(saved)
      showSuccess('Pair created')
    }

    if (pendingVideo.value) {
      saving.value = false
      await runVideoUpload(saved, pendingVideo.value)
    }

    dismissEditor()
    await refreshPairs()
  } catch (err) {
    console.error('Error saving pair:', err)
    formError.value = err?.message || 'Failed to save pair'
  } finally {
    saving.value = false
  }
}

const openDelete = () => {
  deleteModal.value?.showModal()
}

const closeDelete = () => {
  deleteModal.value?.close()
}

const confirmDelete = async () => {
  if (!editingPair.value?.id) return
  deleting.value = true
  try {
    await deletePair(editingPair.value)
    showSuccess('Pair deleted')
    closeDelete()
    dismissEditor()
    await refreshPairs()
  } catch (err) {
    console.error('Error deleting pair:', err)
    showError('Error deleting pair: ' + (err.message || 'Unknown error'))
  } finally {
    deleting.value = false
  }
}

const openRemoveVideo = () => {
  removeVideoModal.value?.showModal()
}

const closeRemoveVideo = () => {
  removeVideoModal.value?.close()
}

const confirmRemoveVideo = async () => {
  if (!editingPair.value?.id) return
  removingVideo.value = true
  videoError.value = ''
  try {
    const saved = await removeVideo(editingPair.value)
    editingPair.value = saved
    replacePairInList(saved)
    pendingVideo.value = null
    if (videoInput.value) videoInput.value.value = ''
    showSuccess('Video removed')
    closeRemoveVideo()
  } catch (err) {
    console.error('Error removing video:', err)
    videoError.value = err?.message || 'Failed to remove video'
  } finally {
    removingVideo.value = false
  }
}

onBeforeUnmount(() => {
  if (pendingPreviewUrl.value) URL.revokeObjectURL(pendingPreviewUrl.value)
})

onMounted(async () => {
  await loadPairs()
})
</script>

<style scoped>
.pair-thumb {
  width: 5.5rem;
  height: 5.5rem;
}

.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
.file-input.ios-field,
select.ios-field,
textarea.ios-field,
input.ios-field {
  font-size: 16px !important;
}
</style>
