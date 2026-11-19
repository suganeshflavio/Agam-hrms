import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark' | 'system'

interface UIState {
  theme: ThemeMode
  sidebarCollapsed: boolean
  currentUser: {
    id: string
    name: string
    email: string
    role: string
    avatar?: string
  }
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem('agam_hrms_theme') as ThemeMode
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved
  }
  return 'system'
}

const initialState: UIState = {
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  currentUser: {
    id: 'emp-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@agam.internal',
    role: 'HR Admin',
  },
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload
      localStorage.setItem('agam_hrms_theme', action.payload)
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
  },
})

export const { setTheme, toggleSidebar, setSidebarCollapsed } = uiSlice.actions
export default uiSlice.reducer
