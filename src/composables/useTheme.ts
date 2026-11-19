import { ref, watch, onMounted } from 'vue'
import { store } from '@/redux/store'
import { setTheme as setReduxTheme, type ThemeMode } from '@/redux/slices/uiSlice'

const currentTheme = ref<ThemeMode>('system')
const isDark = ref<boolean>(false)

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  let darkActive = false

  if (theme === 'dark') {
    darkActive = true
  } else if (theme === 'light') {
    darkActive = false
  } else {
    // system
    darkActive = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  isDark.value = darkActive
  if (darkActive) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useTheme() {
  const initTheme = () => {
    const saved = (localStorage.getItem('agam_hrms_theme') as ThemeMode) || 'system'
    currentTheme.value = saved
    applyTheme(saved)

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme.value === 'system') {
          applyTheme('system')
        }
      })
    }
  }

  const setTheme = (mode: ThemeMode) => {
    currentTheme.value = mode
    localStorage.setItem('agam_hrms_theme', mode)
    store.dispatch(setReduxTheme(mode))
    applyTheme(mode)
  }

  const toggleTheme = () => {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return {
    theme: currentTheme,
    isDark,
    initTheme,
    setTheme,
    toggleTheme,
  }
}
