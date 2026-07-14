import { create } from 'zustand'

const THEME_KEY = 'detail_theme'

const getInitialTheme = (): boolean => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored !== null) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: getInitialTheme(),
  toggle: () =>
    set((state) => {
      const newDark = !state.isDark
      localStorage.setItem(THEME_KEY, newDark ? 'dark' : 'light')
      if (newDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { isDark: newDark }
    }),
  setDark: (dark: boolean) => {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ isDark: dark })
  },
}))
