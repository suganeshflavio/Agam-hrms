<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <!-- Sign-in and password screens render without the app shell -->
  <RouterView v-if="route.path === '/login' || route.meta.public || route.meta.bare" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
