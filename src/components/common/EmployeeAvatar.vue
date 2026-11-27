<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { apiBlob } from '@/services/apiClient'

// Profile photo (fetched with the user's token) or initials when there is none.
const props = withDefaults(defineProps<{ url?: string; name: string; size?: string; rounded?: string }>(), {
  url: undefined,
  size: 'w-10 h-10 text-sm',
  rounded: 'rounded-full',
})

// Shared across avatars so a photo is downloaded once per page load.
const cache = (globalThis as unknown as { __avatarCache?: Map<string, Promise<string>> })
const store = (cache.__avatarCache ??= new Map<string, Promise<string>>())

const src = ref('')
const load = async (url?: string) => {
  src.value = ''
  if (!url) return
  const [path, query = ''] = url.split('?')
  if (!store.has(url)) {
    store.set(url, apiBlob(path as string, Object.fromEntries(new URLSearchParams(query))).then((b) => URL.createObjectURL(b)))
  }
  try {
    src.value = await (store.get(url) as Promise<string>)
  } catch {
    store.delete(url)
  }
}
watch(() => props.url, load, { immediate: true })
onBeforeUnmount(() => (src.value = ''))

const initials = (name: string) => name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
</script>

<template>
  <img v-if="src" :src="src" :alt="name" class="object-cover shrink-0" :class="[size, rounded]" />
  <span
    v-else
    class="inline-flex items-center justify-center shrink-0 font-bold bg-gradient-to-br from-[#1989d9] to-[#044663] text-white"
    :class="[size, rounded]" :aria-label="name"
  >{{ initials(name) }}</span>
</template>
