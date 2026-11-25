<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, Briefcase, Home, FilePenLine } from '@lucide/vue'
import { usePunch } from '@/composables/usePunch'
import type { WorkLocation } from '@/types/hrms'

// Clock In / Clock Out with a work location: Office (default) or Client location.
// One clock-in and one clock-out per day; work done after clocking out is
// claimed with a regularization. Work from home is applied for separately and
// shows as WFH once approved (no clock-in needed that day).
// Styled for the dark cards it sits on; +buttonClass+ sets the main button colours.
const props = withDefaults(defineProps<{ buttonClass?: string; align?: 'start' | 'end' }>(), {
  buttonClass: 'bg-white text-[#044663] hover:bg-sky-50',
  align: 'end',
})
const emit = defineEmits<{ (e: 'punched', message: string): void }>()
const router = useRouter()

const { state, punching, error, message, press, hasEmployeeProfile } = usePunch()

const LOCATIONS: { value: WorkLocation; label: string; icon: typeof Home }[] = [
  { value: 'Office', label: 'Office', icon: Building2 },
  { value: 'Client location', label: 'Client location', icon: Briefcase },
]
const location = ref<WorkLocation>('Office')

const clockedIn = computed(() => !!state.value?.clockedIn)
const doneForDay = computed(() => !clockedIn.value && !!state.value?.doneForDay)
const wfhToday = computed(() => state.value?.wfhToday)
const showPicker = computed(() => hasEmployeeProfile.value && !clockedIn.value && !doneForDay.value)

const buttonLabel = computed(() => {
  if (punching.value) return 'Syncing…'
  if (doneForDay.value) return 'Done for today'
  return clockedIn.value ? 'Clock Out' : 'Clock In'
})
const hint = computed(() => {
  const s = state.value
  if (!hasEmployeeProfile.value) return "Your login isn't linked to an employee profile."
  if (!s) return ''
  if (s.clockedIn) return `Since ${s.since} · ${s.location}`
  if (doneForDay.value) {
    const span = s.office ? `${s.office.location} ${s.office.checkIn} – ${s.office.checkOut}` : 'Clocked out'
    return `${span}. Worked after clocking out? Request a regularization for approval.`
  }
  if (wfhToday.value === 'Pending') return 'Work from home for today is waiting for approval.'
  return ''
})
const justify = computed(() => (props.align === 'end' ? 'sm:items-end sm:text-right' : 'items-start text-left'))

// Opens the attendance calendar on today with the regularization form ready.
const openRegularization = () => {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  router.push({ path: '/attendance', query: { regularize: today } })
}

const onPress = async () => {
  const ok = await press(clockedIn.value ? state.value?.location || 'Office' : location.value)
  if (ok) emit('punched', message.value)
}
</script>

<template>
  <div class="flex flex-col gap-2 min-w-0 w-full" :class="justify">
    <p
      v-if="wfhToday === 'Approved' && !clockedIn"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-400/20 border border-sky-300/30 text-[11px] font-bold text-white"
    >
      <Home class="w-3.5 h-3.5 shrink-0" /> Working from home today (approved) — no clock-in needed
    </p>
    <div
      v-if="showPicker"
      class="scroll-row gap-1 p-1 rounded-xl bg-white/10 border border-white/15 max-w-full"
      role="radiogroup" aria-label="Work location"
    >
      <button
        v-for="l in LOCATIONS" :key="l.value"
        type="button" role="radio" :aria-checked="location === l.value"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        :class="location === l.value ? 'bg-white text-slate-900 shadow-sm' : 'text-white/85 hover:bg-white/15'"
        @click="location = l.value"
      >
        <component :is="l.icon" class="w-3.5 h-3.5 shrink-0" />
        {{ l.label }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2" :class="props.align === 'end' ? 'sm:justify-end' : ''">
      <button
        type="button"
        :disabled="!hasEmployeeProfile || punching || doneForDay"
        class="px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-md active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        :class="props.buttonClass"
        @click="onPress"
      >
        {{ buttonLabel }}
      </button>
      <button
        v-if="doneForDay"
        type="button"
        class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap bg-white/15 text-white hover:bg-white/25 border border-white/20 cursor-pointer"
        @click="openRegularization"
      >
        <FilePenLine class="w-3.5 h-3.5" /> Request regularization
      </button>
    </div>

    <p v-if="error" class="text-[11px] font-semibold text-rose-200 max-w-sm break-words">{{ error }}</p>
    <p v-else-if="hint" class="text-[11px] text-white/80 max-w-sm break-words">{{ hint }}</p>
  </div>
</template>
